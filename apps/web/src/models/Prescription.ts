import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
  userId: mongoose.Types.ObjectId;
  fileUrl: string;
  cloudinaryPublicId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  ocrRawText?: string;
  ocrConfidence?: number;
  aiExtracted?: {
    doctor: { name?: string; registration?: string; hospital?: string };
    patient: { name?: string; age?: string; date?: string };
    medicines: Array<{
      name: string; genericName?: string; dosage: string; form: string;
      frequency: string; times: string[]; foodInstruction: string;
      duration: string; specialInstructions?: string; quantity?: number;
      matchedMedicineId?: string; fdaVerified?: boolean;
      interactions?: string[]; sideEffects?: string[];
    }>;
    confidence: number;
    warnings: string[];
  };
  aiConfidence?: number;
  doctorName?: string;
  doctorReg?: string;
  hospitalName?: string;
  prescriptionDate?: Date;
  status: 'processing' | 'ocr_done' | 'ai_done' | 'reviewed' | 'added' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  cloudinaryPublicId: String,
  fileName: String,
  fileType: String,
  fileSize: Number,
  ocrRawText: String,
  ocrConfidence: Number,
  aiExtracted: Schema.Types.Mixed,
  aiConfidence: Number,
  doctorName: String,
  doctorReg: String,
  hospitalName: String,
  prescriptionDate: Date,
  status: {
    type: String,
    enum: ['processing','ocr_done','ai_done','reviewed','added','failed'],
    default: 'processing',
  },
  errorMessage: String,
}, { timestamps: true });

PrescriptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Prescription || mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
