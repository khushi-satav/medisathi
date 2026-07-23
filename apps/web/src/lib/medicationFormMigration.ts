import {
  resolveMedicationForm,
  deriveDefaultEscalationLevel,
  needsEscalationLevelConfirmation,
} from '@/lib/escalationClassification';

export interface FormMigrationPlanItem {
  medicationId: string;
  userId: string;
  name: string;
  currentForm: string;
  addedByOCR: boolean;
  currentEscalationLevel?: string;
  action: 'recover' | 'flag_no_source' | 'confirm_correct' | 'skip_manual';
  newForm?: string;
  newEscalationLevel?: string;
  newNeedsConfirmation?: boolean;
  reason: string;
}

/**
 * Builds (but does not apply) a migration plan for every Medication whose
 * form is 'tablet' — the value the old unsafe default coerced anything
 * undetermined/unrecognized into (see escalationClassification.ts).
 *
 * For each candidate:
 *  - Manual entries (addedByOCR: false): no raw OCR extraction exists to
 *    check against. SKIPPED — not touched. There is no ground truth to
 *    recover from, and guessing would be exactly the anti-pattern this
 *    whole fix exists to remove.
 *  - Scan-sourced (addedByOCR: true): look up the ORIGINAL raw form from
 *    Prescription.aiExtracted.medicines[] (matched by medication name,
 *    same case-insensitive matching the add-medications route itself uses).
 *      - Raw form found and it resolves to something other than 'tablet' ->
 *        RECOVER: the real form, and re-derive escalationLevel /
 *        needsEscalationLevelConfirmation from it.
 *      - Raw form found and it also resolves to 'tablet' -> CONFIRM_CORRECT:
 *        genuinely a tablet, no change.
 *      - No raw form recoverable (prescription deleted, aiExtracted missing,
 *        or the medication's name was edited since and no longer matches
 *        any extracted entry) -> FLAG_NO_SOURCE: do NOT guess. Downgrade to
 *        escalationLevel 'reminder_only' and set
 *        needsEscalationLevelConfirmation: true, so nothing pre-existing
 *        that we can't verify keeps firing voice calls / emergency-contact
 *        alerts off a form value we can no longer trust.
 *
 * Idempotent: a second run against an already-migrated database finds the
 * same 'tablet' rows (recover only changes `form` away from 'tablet', so
 * recovered rows drop out of the candidate set on the next run; flagged rows
 * keep form:'tablet' but re-planning them again produces the identical
 * target state, so re-applying is a no-op).
 */
export async function buildFormMigrationPlan(models: {
  Medication: any;
  Prescription: any;
}): Promise<FormMigrationPlanItem[]> {
  const { Medication, Prescription } = models;
  const candidates = await Medication.find({ form: 'tablet' });
  const plan: FormMigrationPlanItem[] = [];
  const prescriptionCache = new Map<string, any>();

  for (const med of candidates) {
    const base = {
      medicationId: med._id.toString(),
      userId: med.userId.toString(),
      name: med.name,
      currentForm: med.form,
      addedByOCR: !!med.addedByOCR,
      currentEscalationLevel: med.escalationLevel,
    };

    if (!med.addedByOCR) {
      plan.push({
        ...base,
        action: 'skip_manual',
        reason: 'Manually entered — no raw OCR extraction exists to re-derive the true form from. Not touched.',
      });
      continue;
    }

    let rawForm: string | undefined;
    if (med.prescriptionId) {
      const rxId = med.prescriptionId.toString();
      let rx = prescriptionCache.get(rxId);
      if (rx === undefined) {
        rx = await Prescription.findById(med.prescriptionId);
        prescriptionCache.set(rxId, rx ?? null);
      }
      const medicines = rx?.aiExtracted?.medicines ?? [];
      const match = medicines.find(
        (m: any) => (m.name || '').trim().toLowerCase() === med.name.trim().toLowerCase()
      );
      rawForm = match?.form;
    }

    if (!rawForm) {
      const alreadyDowngraded =
        med.escalationLevel === 'reminder_only' && med.needsEscalationLevelConfirmation === true;
      plan.push({
        ...base,
        action: 'flag_no_source',
        newEscalationLevel: 'reminder_only',
        newNeedsConfirmation: true,
        reason: alreadyDowngraded
          ? 'Already flagged/downgraded by a previous migration run — no effective change.'
          : 'Scan-sourced but the original raw extraction is unavailable (prescription deleted, or name no longer matches) — cannot verify "tablet" is correct, so downgrading rather than trusting it.',
      });
      continue;
    }

    const resolved = resolveMedicationForm(rawForm);
    if (resolved === 'tablet') {
      plan.push({
        ...base,
        action: 'confirm_correct',
        reason: `Raw extraction also said "${rawForm}" -> genuinely a tablet. No change.`,
      });
      continue;
    }

    plan.push({
      ...base,
      action: 'recover',
      newForm: resolved,
      newEscalationLevel: deriveDefaultEscalationLevel(resolved),
      newNeedsConfirmation: needsEscalationLevelConfirmation(resolved),
      reason: `Raw extraction said "${rawForm}" but was coerced to "tablet" by the old default-to-tablet bug. Recovering true form.`,
    });
  }

  return plan;
}

/** Applies a plan built by buildFormMigrationPlan(). Returns the number of documents written. */
export async function applyFormMigrationPlan(
  Medication: any,
  plan: FormMigrationPlanItem[]
): Promise<number> {
  let applied = 0;
  for (const item of plan) {
    if (item.action === 'recover') {
      await Medication.findByIdAndUpdate(item.medicationId, {
        form: item.newForm,
        escalationLevel: item.newEscalationLevel,
        needsEscalationLevelConfirmation: item.newNeedsConfirmation,
      });
      applied++;
    } else if (item.action === 'flag_no_source') {
      await Medication.findByIdAndUpdate(item.medicationId, {
        escalationLevel: item.newEscalationLevel,
        needsEscalationLevelConfirmation: item.newNeedsConfirmation,
      });
      applied++;
    }
    // 'confirm_correct' and 'skip_manual' -> no write.
  }
  return applied;
}

export function summarizePlan(plan: FormMigrationPlanItem[]): Record<string, number> {
  const summary: Record<string, number> = { recover: 0, flag_no_source: 0, confirm_correct: 0, skip_manual: 0 };
  for (const item of plan) summary[item.action] = (summary[item.action] || 0) + 1;
  return summary;
}
