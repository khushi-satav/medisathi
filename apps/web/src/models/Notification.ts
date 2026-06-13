import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'DOSE_REMINDER'
  | 'DOSE_OVERDUE'
  | 'DOSE_MISSED'
  | 'REFILL_ALERT'
  | 'CAREGIVER_ALERT'
  | 'STREAK_MILESTONE'
  | 'WEEKLY_REPORT'
  | 'SYSTEM';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'DOSE_REMINDER',
        'DOSE_OVERDUE',
        'DOSE_MISSED',
        'REFILL_ALERT',
        'CAREGIVER_ALERT',
        'STREAK_MILESTONE',
        'WEEKLY_REPORT',
        'SYSTEM',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
