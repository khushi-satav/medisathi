import mongoose, { Schema, Document } from 'mongoose';

export interface ISimulationLog extends Document {
  type: 'push' | 'sms' | 'call' | 'escalation_start' | 'escalation_step' | 'resolve' | 'cron';
  recipientName: string;
  recipientPhone?: string;
  recipientRole?: string;
  message: string;
  status: 'success' | 'simulated' | 'failed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

const SimulationLogSchema = new Schema<ISimulationLog>(
  {
    type: {
      type: String,
      enum: ['push', 'sms', 'call', 'escalation_start', 'escalation_step', 'resolve', 'cron'],
      required: true,
    },
    recipientName: { type: String, required: true },
    recipientPhone: String,
    recipientRole: String,
    message: { type: String, required: true },
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SimulationLogSchema.index({ createdAt: -1 });

export default mongoose.models.SimulationLog ||
  mongoose.model<ISimulationLog>('SimulationLog', SimulationLogSchema);
