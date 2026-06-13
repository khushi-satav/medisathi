import mongoose, { Schema, Document } from 'mongoose';

export interface IEscalationState extends Document {
  userId: mongoose.Types.ObjectId;
  medicationId: mongoose.Types.ObjectId;
  doseLogId: mongoose.Types.ObjectId;
  status: 'active' | 'resolved' | 'failed';
  missedAt: Date; // scheduled time of the dose
  currentStep: 't0' | 't15' | 't30' | 't60' | 't120' | 'done';
  stepsSent: string[]; // ['t0', 't15', 't30', 't60', 't120']
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
      enum: ['active', 'resolved', 'failed'],
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
  },
  { timestamps: true }
);

EscalationStateSchema.index({ status: 1, missedAt: 1 });

export default mongoose.models.EscalationState ||
  mongoose.model<IEscalationState>('EscalationState', EscalationStateSchema);
