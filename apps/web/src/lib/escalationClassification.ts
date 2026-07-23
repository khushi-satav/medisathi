/**
 * Single source of truth for valid medication forms. Every place that
 * validates, normalizes, or offers a choice of `form` (the Mongoose schema,
 * the manual-add and OCR-add API routes, the frontend type, the add-med UI)
 * must import this list rather than keeping its own copy — duplicated copies
 * are exactly how forms Gemini is instructed to emit (syrup, ointment,
 * powder, gel, suspension — see gemini.ts) ended up not being in the schema
 * enum at all.
 */
export const MEDICATION_FORMS = [
  // Oral / systemic — escalate fully by default.
  'tablet', 'capsule', 'liquid', 'syrup', 'suspension', 'injection', 'inhaler',
  // Ambiguous — real-world use spans systemic and low-stakes (a drop could be
  // glaucoma medication or an ear lubricant; a patch could be fentanyl or
  // nicotine; a powder could be oral rehydration salts or foot powder) —
  // cannot be told apart from the form name alone.
  'drops', 'patch', 'powder',
  // Topical / dermatological / cosmetic — do not escalate by default.
  'cream', 'ointment', 'gel', 'lotion', 'soap', 'sunscreen', 'shampoo',
  // Unclassified catch-all.
  'other',
] as const;

export type MedicationForm = typeof MEDICATION_FORMS[number];

export type EscalationLevel = 'none' | 'reminder_only' | 'full';

/**
 * Default escalation-level classification by medication form.
 *
 * A missed oral/systemic medication is a materially different event from a
 * missed topical application — the same push -> SMS -> voice call ->
 * caregiver SMS -> emergency contact SMS chain must not fire for a missed
 * sunscreen or moisturiser the way it does for a missed heart medication.
 *
 *   'full'          — complete t0..t120 chain (push, SMS, call, caregiver, emergency)
 *   'reminder_only' — a single t0 push only, then the escalation is capped
 *   'none'          — no escalation at all (still logged as missed for adherence)
 *
 * Classification source: the existing `form` field, not a drug-name lookup
 * or a per-medication prompt at add-time. Rationale:
 *   - `form` already exists on every medication (OCR-extracted or manually
 *     entered) — zero new data collection required, so the safe default
 *     applies to every medication from day one, not just ones a user
 *     happens to configure.
 *   - A drug-name -> category lookup would require maintaining a real drug
 *     database (out of scope) and still needs a fallback for anything not
 *     in it — `form` is the fallback either way.
 *   - Prompting for confirmation on every single medication add is the most
 *     accurate option but adds friction to the common, unambiguous cases
 *     (a tablet is obviously systemic; a cream is obviously topical).
 *     Reserve that friction for the genuinely ambiguous forms only — see
 *     AMBIGUOUS_FORMS below.
 *
 * An UNDETERMINED form (missing, or a value OCR/a caller supplied that isn't
 * in MEDICATION_FORMS at all) must fail toward 'other', never 'tablet' —
 * see resolveMedicationForm() below. 'other' maps to 'reminder_only' via the
 * fallthrough at the end of deriveDefaultEscalationLevel, same as the
 * genuinely-ambiguous forms.
 */
const FULL_ESCALATION_FORMS = new Set<MedicationForm>(['tablet', 'capsule', 'liquid', 'syrup', 'suspension', 'injection', 'inhaler']);
const NONE_ESCALATION_FORMS = new Set<MedicationForm>(['cream', 'ointment', 'gel', 'lotion', 'soap', 'sunscreen', 'shampoo']);
const AMBIGUOUS_FORMS = new Set<string>(['drops', 'patch', 'powder', 'other']);

export function deriveDefaultEscalationLevel(form?: string): EscalationLevel {
  const f = (form || '').toLowerCase() as MedicationForm;
  if (FULL_ESCALATION_FORMS.has(f)) return 'full';
  if (NONE_ESCALATION_FORMS.has(f)) return 'none';
  return 'reminder_only'; // ambiguous or unrecognized form — least aggressive with signal
}

export function needsEscalationLevelConfirmation(form?: string): boolean {
  return AMBIGUOUS_FORMS.has((form || '').toLowerCase());
}

/**
 * Normalizes a raw form string (from OCR, a manual-add request body, or
 * anywhere else) against MEDICATION_FORMS. Returns 'other' — never
 * 'tablet' — for anything missing, unrecognized, or not confidently in the
 * list. This is the ONLY place that should decide what an undetermined form
 * becomes; every route that currently hand-rolls
 * `list.includes(x) ? x : 'tablet'` should call this instead.
 */
export function resolveMedicationForm(rawForm?: string | null): MedicationForm {
  const f = (rawForm || '').toLowerCase().trim();
  return (MEDICATION_FORMS as readonly string[]).includes(f) ? (f as MedicationForm) : 'other';
}

/**
 * Resolves the level to actually use for a given medication, falling back
 * to the form-derived default for documents that predate this field (no
 * migration has been run — this makes the fallback correct without one).
 */
export function getEffectiveEscalationLevel(med: { escalationLevel?: EscalationLevel | null; form?: string }): EscalationLevel {
  return med.escalationLevel ?? deriveDefaultEscalationLevel(med.form);
}
