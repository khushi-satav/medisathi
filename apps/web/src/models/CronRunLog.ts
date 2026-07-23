import mongoose, { Schema, Document } from 'mongoose';

export interface ICronRunLog extends Document {
  jobName: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  summary: Record<string, number>;
  error?: string;
  createdAt: Date;
}

const CronRunLogSchema = new Schema<ICronRunLog>(
  {
    jobName: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    summary: { type: Schema.Types.Mixed, default: {} },
    error: String,
  },
  { timestamps: true }
);

CronRunLogSchema.index({ jobName: 1, startedAt: -1 });

export default mongoose.models.CronRunLog || mongoose.model<ICronRunLog>('CronRunLog', CronRunLogSchema);
