import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  phone?: string;
  fcmToken?: string;
  passwordHash: string;
  name: string;
  age?: number;
  gender?: string;
  profilePhoto?: string;
  language: string;
  timezone: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
  isVerified: boolean;
  specialization?: string;
  phoneVerified?: boolean;
  phoneOtp?: {
    code: string;
    expiresAt: Date;
  };
  conditions: Array<{ name: string; icdCode?: string; severity?: string }>;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string; isPrimary: boolean }>;
  caregiverLinks: Array<{
    userId: mongoose.Types.ObjectId;
    email?: string;
    name?: string;
    relationship: string;
    permissions: string[];
    isActive: boolean;
    linkedAt?: Date;
  }>;
  doctorLinks: Array<{
    doctorId: mongoose.Types.ObjectId;
    name?: string;
    specialization?: string;
    isActive: boolean;
    linkedAt?: Date;
  }>;
  doctorNotes: Array<{
    doctorId: mongoose.Types.ObjectId;
    doctorName?: string;
    note: string;
    createdAt: Date;
  }>;
  settings?: {
    insulin_reminders: boolean;
    appointment_reminders: boolean;
    meal_reminders: boolean;
    mood_checkins: boolean;
    school_mode: boolean;
    smart_timing: boolean;
    caregiver_alerts: boolean;
    refill_alerts: boolean;
    missed_dose_escalation: boolean;
    weekly_report: boolean;
    advance_reminder_time: number;
    share_logs_doctor: boolean;
    shared_doctor_id?: mongoose.Types.ObjectId;
  };
  sosMessage?: string;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true },
  fcmToken: { type: String },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  profilePhoto: String,
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  role: { type: String, enum: ['patient', 'caregiver', 'doctor', 'admin'], default: 'patient' },
  specialization: { type: String },
  isVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  phoneOtp: {
    code: String,
    expiresAt: Date,
  },
  conditions: [{ name: { type: String, required: true }, icdCode: String, severity: String }],
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: String,
    isPrimary: { type: Boolean, default: false },
  }],
  caregiverLinks: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    email: String,
    name: String,
    relationship: String,
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    linkedAt: { type: Date, default: Date.now },
  }],
  doctorLinks: [{
    doctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    specialization: String,
    isActive: { type: Boolean, default: true },
    linkedAt: { type: Date, default: Date.now },
  }],
  doctorNotes: [{
    doctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    doctorName: String,
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  settings: {
    insulin_reminders: { type: Boolean, default: true },
    appointment_reminders: { type: Boolean, default: true },
    meal_reminders: { type: Boolean, default: true },
    mood_checkins: { type: Boolean, default: true },
    school_mode: { type: Boolean, default: false },
    smart_timing: { type: Boolean, default: true },
    caregiver_alerts: { type: Boolean, default: true },
    refill_alerts: { type: Boolean, default: true },
    missed_dose_escalation: { type: Boolean, default: true },
    weekly_report: { type: Boolean, default: true },
    advance_reminder_time: { type: Number, default: 15 },
    share_logs_doctor: { type: Boolean, default: false },
    shared_doctor_id: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  sosMessage: { type: String, default: 'EMERGENCY: I need help. Please contact me immediately.' },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

// Indexes are already defined via unique:true in the schema above

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
