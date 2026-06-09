import mongoose, { Schema, Document } from 'mongoose';

export interface ICaregiverInvite extends Document {
  patientId: mongoose.Types.ObjectId;
  caregiverEmail: string;
  caregiverId?: mongoose.Types.ObjectId;
  relationship: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  token: string;
  permissions: string[];
  expiresAt: Date;
  acceptedAt?: Date;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaregiverInviteSchema = new Schema<ICaregiverInvite>({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  caregiverEmail: { type: String, required: true, lowercase: true, trim: true },
  caregiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  relationship: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'revoked'], default: 'pending' },
  token: { type: String, required: true, unique: true },
  permissions: { type: [String], default: ['read_logs', 'receive_alerts'] },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
  acceptedAt: Date,
  message: String,
}, { timestamps: true });

export default mongoose.models.CaregiverInvite || mongoose.model<ICaregiverInvite>('CaregiverInvite', CaregiverInviteSchema);
