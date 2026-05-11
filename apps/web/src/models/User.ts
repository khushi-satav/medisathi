import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  phone?: string;
  passwordHash: string;
  name: string;
  age?: number;
  gender?: string;
  profilePhoto?: string;
  language: string;
  timezone: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
  isVerified: boolean;
  conditions: Array<{ name: string; icdCode?: string; severity?: string }>;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string; isPrimary: boolean }>;
  caregiverLinks: Array<{ userId: mongoose.Types.ObjectId; relationship: string; permissions: string[]; isActive: boolean }>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  profilePhoto: String,
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  role: { type: String, enum: ['patient', 'caregiver', 'doctor', 'admin'], default: 'patient' },
  isVerified: { type: Boolean, default: false },
  conditions: [{ name: { type: String, required: true }, icdCode: String, severity: String }],
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: String,
    isPrimary: { type: Boolean, default: false },
  }],
  caregiverLinks: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    relationship: String,
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
  }],
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
