import mongoose, { Schema, Document } from 'mongoose';
import { deriveDefaultEscalationLevel, needsEscalationLevelConfirmation, EscalationLevel, MEDICATION_FORMS, MedicationForm } from '@/lib/escalationClassification';

export interface IMedication extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  genericName?: string;
  dosage: string;
  form: MedicationForm;
  condition?: string;
  color: string;
  times: string[];
  foodInstruction: 'before_meal' | 'after_meal' | 'with_meal' | 'empty_stomach' | 'any_time';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  isOngoing: boolean;
  stockCount: number;
  stockUpdatedAt: Date;
  refillAlertDays: number;
  daysSupply: number;
  refillThreshold: number;
  prescriptionId?: mongoose.Types.ObjectId;
  addedByOCR: boolean;
  fdaVerified: boolean;
  interactions: string[];
  sideEffects: string[];
  specialInstructions?: string;
  // How aggressively a missed dose of this medication escalates. Defaulted
  // from `form` on creation (see escalationClassification.ts) if not set
  // explicitly — 'full' for oral/systemic forms, 'none' for topicals,
  // 'reminder_only' for anything ambiguous.
  escalationLevel?: EscalationLevel;
  // True when `form` is one where a missed dose's real-world severity can't
  // be inferred (drops, patch, other) — the add-medication flow should
  // prompt the user to confirm/override escalationLevel rather than the
  // safe-default 'reminder_only' silently sticking.
  needsEscalationLevelConfirmation: boolean;
  // True when this medication was created from an extracted prescription
  // duration that was missing or unparseable, so no endDate could be set
  // and isOngoing was NOT assumed — the user needs to confirm the actual
  // course length.
  needsDurationConfirmation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<IMedication>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  genericName: String,
  dosage: { type: String, required: true },
  form: {
    type: String,
    enum: MEDICATION_FORMS,
    // 'other' — NOT 'tablet'. An undetermined form must fail toward the
    // least aggressive escalation level (see escalationClassification.ts),
    // not the most aggressive one. This default only applies when `form` is
    // omitted entirely; every route that receives a form value from OCR or
    // a request body should already have run it through
    // resolveMedicationForm() before this is reached, so 'tablet' is only
    // ever set when a caller explicitly says so.
    default: 'other',
  },
  condition: String,
  color: { type: String, default: '#6C63FF' },
  times: [{ type: String }],
  foodInstruction: {
    type: String,
    enum: ['before_meal','after_meal','with_meal','empty_stomach','any_time'],
    default: 'after_meal',
  },
  startDate: { type: Date, required: true },
  endDate: Date,
  isActive: { type: Boolean, default: true },
  isOngoing: { type: Boolean, default: true },
  stockCount: { type: Number, default: 30 },
  stockUpdatedAt: { type: Date, default: Date.now },
  refillAlertDays: { type: Number, default: 7 },
  daysSupply: { type: Number, default: 30 },
  refillThreshold: { type: Number, default: 7 },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  addedByOCR: { type: Boolean, default: false },
  fdaVerified: { type: Boolean, default: false },
  interactions: [String],
  sideEffects: [String],
  specialInstructions: String,
  escalationLevel: {
    type: String,
    enum: ['none', 'reminder_only', 'full'],
    // No hard default here on purpose — the pre-save hook below computes it
    // from `form` only when the caller didn't supply one explicitly, so an
    // explicit choice (future per-medication UI override) is never clobbered.
  },
  needsEscalationLevelConfirmation: { type: Boolean, default: false },
  needsDurationConfirmation: { type: Boolean, default: false },
}, { timestamps: true });

MedicationSchema.index({ userId: 1, isActive: 1 });
MedicationSchema.index({ userId: 1, createdAt: -1 });
MedicationSchema.index({ isActive: 1, endDate: 1 });

// Only classify NEW documents that didn't already get an explicit
// escalationLevel from the caller. Documents that predate this field, or
// that are being updated (not created), are intentionally left alone here —
// see getEffectiveEscalationLevel() for the read-time fallback that covers
// pre-existing documents without needing a migration.
MedicationSchema.pre('save', async function () {
  if (this.isNew && !this.escalationLevel) {
    this.escalationLevel = deriveDefaultEscalationLevel(this.form);
    this.needsEscalationLevelConfirmation = needsEscalationLevelConfirmation(this.form);
  }
});

export default mongoose.models.Medication || mongoose.model<IMedication>('Medication', MedicationSchema);
