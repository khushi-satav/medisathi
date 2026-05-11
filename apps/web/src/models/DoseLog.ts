import mongoose, { Schema, Document } from 'mongoose';

export interface IDoseLog extends Document {
  userId: mongoose.Types.ObjectId;
  medicationId: mongoose.Types.ObjectId;
  scheduledTime: Date;
  scheduledDate: string;
  takenAt?: Date;
  status: 'taken' | 'missed' | 'skipped' | 'snoozed' | 'pending';
  skipReason?: string;
  snoozedUntil?: Date;
  loggedBy?: mongoose.Types.ObjectId;
  deviceType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DoseLogSchema = new Schema<IDoseLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  medicationId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  scheduledTime: { type: Date, required: true },
  scheduledDate: { type: String, required: true },
  takenAt: Date,
  status: {
    type: String,
    enum: ['taken','missed','skipped','snoozed','pending'],
    default: 'pending',
  },
  skipReason: String,
  snoozedUntil: Date,
  loggedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deviceType: String,
}, { timestamps: true });

DoseLogSchema.index({ medicationId: 1, scheduledDate: 1, scheduledTime: 1 }, { unique: true });
DoseLogSchema.index({ userId: 1, scheduledDate: 1 });
DoseLogSchema.index({ userId: 1, status: 1 });

export default mongoose.models.DoseLog || mongoose.model<IDoseLog>('DoseLog', DoseLogSchema);
