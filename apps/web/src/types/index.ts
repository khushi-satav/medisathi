// MediSaathi Core Types

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  profilePhoto?: string;
  language: string;
  timezone: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
  isVerified: boolean;
  conditions: Array<{
    name: string;
    icdCode?: string;
    severity?: string;
  }>;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
    isPrimary: boolean;
  }>;
  caregiverLinks: Array<{
    userId: string;
    relationship: string;
    permissions: string[];
    isActive: boolean;
  }>;
  createdAt: string;
}

export interface Medication {
  _id: string;
  userId: string;
  name: string;
  genericName?: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'drops' | 'patch' | 'inhaler' | 'cream' | 'other';
  condition?: string;
  color: string;
  times: string[];
  foodInstruction: 'before_meal' | 'after_meal' | 'with_meal' | 'empty_stomach' | 'any_time';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isOngoing: boolean;
  stockCount: number;
  refillAlertDays: number;
  addedByOCR: boolean;
  fdaVerified: boolean;
  interactions: string[];
  sideEffects: string[];
  specialInstructions?: string;
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoseLog {
  _id: string;
  userId: string;
  medicationId: string;
  scheduledTime: string;
  scheduledDate: string;
  takenAt?: string;
  status: 'taken' | 'missed' | 'skipped' | 'snoozed' | 'pending';
  skipReason?: string;
  snoozedUntil?: string;
  createdAt: string;
}

export interface DoseScheduleItem {
  medicationId: string;
  name: string;
  dosage: string;
  time: string;
  scheduledTime: string;
  foodInstruction: string;
  condition?: string;
  color: string;
  status: 'taken' | 'missed' | 'skipped' | 'snoozed' | 'pending' | 'upcoming' | 'overdue';
  logId?: string;
  skipReason?: string;
  snoozedUntil?: string;
}

export interface Prescription {
  _id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  ocrRawText?: string;
  ocrConfidence?: number;
  aiExtracted?: {
    doctor: { name?: string; registration?: string; hospital?: string };
    patient: { name?: string; age?: string; date?: string };
    medicines: ExtractedMedicine[];
    confidence: number;
    warnings: string[];
  };
  aiConfidence?: number;
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  status: 'processing' | 'ocr_done' | 'ai_done' | 'reviewed' | 'added' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export interface ExtractedMedicine {
  name: string;
  genericName?: string;
  dosage: string;
  form: string;
  frequency: string;
  times: string[];
  foodInstruction: string;
  duration: string;
  specialInstructions?: string;
  quantity?: number;
  matchedMedicineId?: string;
  fdaVerified?: boolean;
  interactions?: string[];
  sideEffects?: string[];
}

export interface AdherenceStats {
  date: string;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  adherenceRate: number;
  streakDay: number;
}

export interface Medicine {
  _id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  drugClass: string;
  sideEffects: string[];
  interactions: string[];
}

export interface MLPrediction {
  missRisk: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  recommendation: string;
  confidence: number;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'dose_reminder' | 'missed_dose' | 'refill_alert' | 'caregiver_alert' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  age?: number;
  gender?: string;
}

export interface AddMedicationForm {
  name: string;
  dosage: string;
  form: string;
  times: string[];
  foodInstruction: string;
  startDate: string;
  endDate?: string;
  stockCount: number;
  condition?: string;
  color: string;
  isOngoing: boolean;
  specialInstructions?: string;
}
