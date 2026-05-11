import mongoose, { Schema, Document } from 'mongoose';

export interface IMedication extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  genericName?: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'drops' | 'patch' | 'inhaler' | 'cream' | 'other';
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
  prescriptionId?: mongoose.Types.ObjectId;
  addedByOCR: boolean;
  fdaVerified: boolean;
  interactions: string[];
  sideEffects: string[];
  specialInstructions?: string;
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
    enum: ['tablet','capsule','liquid','injection','drops','patch','inhaler','cream','other'],
    default: 'tablet',
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
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  addedByOCR: { type: Boolean, default: false },
  fdaVerified: { type: Boolean, default: false },
  interactions: [String],
  sideEffects: [String],
  specialInstructions: String,
}, { timestamps: true });

MedicationSchema.index({ userId: 1, isActive: 1 });
MedicationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Medication || mongoose.model<IMedication>('Medication', MedicationSchema);
