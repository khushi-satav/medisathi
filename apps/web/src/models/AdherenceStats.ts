import mongoose, { Schema, Document } from 'mongoose';

export interface IAdherenceStats extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  adherenceRate: number;
  streakDay: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdherenceStatsSchema = new Schema<IAdherenceStats>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  totalDoses: { type: Number, default: 0 },
  takenDoses: { type: Number, default: 0 },
  missedDoses: { type: Number, default: 0 },
  skippedDoses: { type: Number, default: 0 },
  adherenceRate: { type: Number, default: 0 },
  streakDay: { type: Number, default: 0 },
}, { timestamps: true });

AdherenceStatsSchema.index({ userId: 1, date: -1 });
AdherenceStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.AdherenceStats || mongoose.model<IAdherenceStats>('AdherenceStats', AdherenceStatsSchema);
