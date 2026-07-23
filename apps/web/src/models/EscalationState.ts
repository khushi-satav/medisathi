import mongoose, { Schema, Document } from 'mongoose';
import { EscalationLevel } from '@/lib/escalationClassification';

export interface IEscalationState extends Document {
  userId: mongoose.Types.ObjectId;
  medicationId: mongoose.Types.ObjectId;
  doseLogId: mongoose.Types.ObjectId;
  status: 'active' | 'resolved' | 'failed' | 'capped';
  missedAt: Date; // scheduled time of the dose
  currentStep: 't0' | 't15' | 't30' | 't60' | 't120' | 'done';
  stepsSent: string[]; // ['t0', 't15', 't30', 't60', 't120']
  // Snapshotted from the medication's effective escalation level at the
  // moment this escalation was created, NOT read live from Medication on
  // every step — so changing a medication's configured level mid-flight
  // can't retroactively alter an escalation that's already in progress.
  escalationLevel: EscalationLevel;
  createdAt: Date;
  updatedAt: Date;
}

const EscalationStateSchema = new Schema<IEscalationState>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicationId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    doseLogId: { type: Schema.Types.ObjectId, ref: 'DoseLog', required: true, unique: true, index: true },
    status: {
      type: String,
      // 'capped' = terminated by design (escalationLevel !== 'full'), not
      // because the patient responded (that's 'resolved') or the chain ran
      // out (that's 'failed').
      enum: ['active', 'resolved', 'failed', 'capped'],
      default: 'active',
      index: true,
    },
    missedAt: { type: Date, required: true },
    currentStep: {
      type: String,
      enum: ['t0', 't15', 't30', 't60', 't120', 'done'],
      default: 't0',
    },
    stepsSent: [{ type: String }],
    escalationLevel: {
      type: String,
      enum: ['none', 'reminder_only', 'full'],
      required: true,
    },
  },
  { timestamps: true }
);

EscalationStateSchema.index({ status: 1, missedAt: 1 });

export default mongoose.models.EscalationState ||
  mongoose.model<IEscalationState>('EscalationState', EscalationStateSchema);
