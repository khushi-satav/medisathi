/**
 * MediSaathi — Database Seed Script
 * Run: node src/seed/seed.js
 *
 * Inserts sample data: Sunita Devi (patient) with medications,
 * dose logs, prescriptions, and adherence stats.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medisaathi';

// ─── Connect ─────────────────────────────────────────────────────────────────
async function connect() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', MONGODB_URI);
}

// ─── Schema Definitions (inline, no imports needed) ──────────────────────────
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  role: { type: String, enum: ['patient', 'caregiver', 'doctor', 'admin'], default: 'patient' },
  isVerified: { type: Boolean, default: false },
  conditions: [{ name: String, icdCode: String, severity: String }],
  caregiverLinks: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    relationship: String,
    permissions: [String],
    isActive: { type: Boolean, default: true },
  }],
  emergencyContacts: [{ name: String, phone: String, relationship: String, isPrimary: Boolean }],
}, { timestamps: true });

const MedicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  genericName: String,
  dosage: { type: String, required: true },
  form: { type: String, enum: ['tablet','capsule','liquid','injection','drops','patch','inhaler','cream','other'], default: 'tablet' },
  condition: String,
  color: { type: String, default: '#6C63FF' },
  times: [String],
  foodInstruction: { type: String, enum: ['before_meal','after_meal','with_meal','empty_stomach','any_time'], default: 'after_meal' },
  startDate: { type: Date, required: true },
  endDate: Date,
  isActive: { type: Boolean, default: true },
  isOngoing: { type: Boolean, default: true },
  stockCount: { type: Number, default: 30 },
  refillAlertDays: { type: Number, default: 7 },
  fdaVerified: { type: Boolean, default: false },
  interactions: [String],
  sideEffects: [String],
  addedByOCR: { type: Boolean, default: false },
}, { timestamps: true });

const PrescriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  fileName: String,
  fileType: String,
  ocrRawText: String,
  ocrConfidence: Number,
  aiExtracted: Schema.Types.Mixed,
  aiConfidence: Number,
  doctorName: String,
  hospitalName: String,
  status: { type: String, enum: ['processing','ocr_done','ai_done','reviewed','added','failed'], default: 'ai_done' },
}, { timestamps: true });

const DoseLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  medicationId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  scheduledTime: { type: Date, required: true },
  scheduledDate: { type: String, required: true },
  takenAt: Date,
  status: { type: String, enum: ['taken','missed','skipped','snoozed','pending'], default: 'pending' },
}, { timestamps: true });

const AdherenceStatsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  totalDoses: { type: Number, default: 0 },
  takenDoses: { type: Number, default: 0 },
  missedDoses: { type: Number, default: 0 },
  skippedDoses: { type: Number, default: 0 },
  adherenceRate: { type: Number, default: 0 },
  streakDay: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Models ───────────────────────────────────────────────────────────────────
const User        = mongoose.models.User          || mongoose.model('User', UserSchema);
const Medication  = mongoose.models.Medication    || mongoose.model('Medication', MedicationSchema);
const Prescription= mongoose.models.Prescription  || mongoose.model('Prescription', PrescriptionSchema);
const DoseLog     = mongoose.models.DoseLog       || mongoose.model('DoseLog', DoseLogSchema);
const AdherenceStats = mongoose.models.AdherenceStats || mongoose.model('AdherenceStats', AdherenceStatsSchema);

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  // ── 1. User ──────────────────────────────────────────────────────────────
  console.log('\n👤 Creating user: Sunita Devi...');

  const passwordHash = await bcrypt.hash('Sunita@123', 12);

  const user = await User.findOneAndUpdate(
    { email: 'sunita@gmail.com' },
    {
      $setOnInsert: {
        email: 'sunita@gmail.com',
        phone: '+919876543210',
        passwordHash,
        name: 'Sunita Devi',
        age: 68,
        gender: 'female',
        language: 'hi',
        timezone: 'Asia/Kolkata',
        role: 'patient',
        isVerified: true,
        conditions: [
          { name: 'Type 2 Diabetes', icdCode: 'E11' },
          { name: 'Hypertension', icdCode: 'I10' },
        ],
        caregiverLinks: [],
        emergencyContacts: [
          { name: 'Anil Kumar', phone: '+919999999999', relationship: 'Son', isPrimary: true }
        ],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`   ✅ User ID: ${user._id}  | Email: sunita@gmail.com | Password: Sunita@123`);

  // ── 2. Medications ────────────────────────────────────────────────────────
  console.log('\n💊 Creating medications...');

  const [metformin, amlodipine] = await Promise.all([
    Medication.findOneAndUpdate(
      { userId: user._id, name: 'Metformin' },
      {
        $setOnInsert: {
          userId: user._id,
          name: 'Metformin',
          dosage: '500mg',
          form: 'tablet',
          condition: 'Type 2 Diabetes',
          color: '#4CAF50',
          times: ['08:00', '20:00'],
          foodInstruction: 'after_meal',
          startDate: new Date('2026-05-01'),
          isActive: true,
          isOngoing: true,
          stockCount: 45,
          refillAlertDays: 7,
          fdaVerified: true,
          sideEffects: ['Nausea', 'Diarrhea'],
          interactions: ['Alcohol'],
          addedByOCR: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    Medication.findOneAndUpdate(
      { userId: user._id, name: 'Amlodipine' },
      {
        $setOnInsert: {
          userId: user._id,
          name: 'Amlodipine',
          dosage: '5mg',
          form: 'tablet',
          condition: 'Hypertension',
          color: '#2196F3',
          times: ['09:00'],
          foodInstruction: 'before_meal',
          startDate: new Date('2026-05-01'),
          isActive: true,
          isOngoing: true,
          stockCount: 20,
          refillAlertDays: 7,
          fdaVerified: true,
          sideEffects: ['Fatigue'],
          interactions: ['Grapefruit'],
          addedByOCR: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
  ]);

  console.log(`   ✅ Metformin  ID: ${metformin._id}`);
  console.log(`   ✅ Amlodipine ID: ${amlodipine._id}`);

  // ── 3. Prescription ───────────────────────────────────────────────────────
  console.log('\n📄 Creating prescription...');

  const prescription = await Prescription.findOneAndUpdate(
    { userId: user._id, doctorName: 'Dr. Priya Sharma' },
    {
      $setOnInsert: {
        userId: user._id,
        fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        fileName: 'sample-prescription.jpg',
        fileType: 'image/jpeg',
        ocrRawText: 'Tab Metformin 500mg 1-0-1 after meals',
        ocrConfidence: 0.94,
        aiConfidence: 0.94,
        doctorName: 'Dr. Priya Sharma',
        hospitalName: 'AIIMS Bhopal',
        status: 'ai_done',
        aiExtracted: {
          doctor: { name: 'Dr. Priya Sharma', hospital: 'AIIMS Bhopal' },
          patient: { name: 'Sunita Devi', age: '68' },
          medicines: [
            {
              name: 'Metformin',
              dosage: '500mg',
              times: ['08:00', '20:00'],
              foodInstruction: 'after_meal',
              duration: '30 days',
            },
          ],
          confidence: 0.94,
          warnings: [],
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`   ✅ Prescription ID: ${prescription._id}`);

  // ── 4. Dose Logs ──────────────────────────────────────────────────────────
  console.log('\n📋 Creating dose logs...');

  const doseLogs = [
    {
      filter: { userId: user._id, medicationId: metformin._id, scheduledDate: '2026-05-12', scheduledTime: new Date('2026-05-12T08:00:00') },
      data: {
        userId: user._id,
        medicationId: metformin._id,
        scheduledTime: new Date('2026-05-12T08:00:00'),
        scheduledDate: '2026-05-12',
        status: 'taken',
        takenAt: new Date('2026-05-12T08:07:00'),
      },
    },
    {
      filter: { userId: user._id, medicationId: amlodipine._id, scheduledDate: '2026-05-12', scheduledTime: new Date('2026-05-12T09:00:00') },
      data: {
        userId: user._id,
        medicationId: amlodipine._id,
        scheduledTime: new Date('2026-05-12T09:00:00'),
        scheduledDate: '2026-05-12',
        status: 'missed',
        takenAt: null,
      },
    },
  ];

  for (const { filter, data } of doseLogs) {
    const log = await DoseLog.findOneAndUpdate(filter, { $setOnInsert: data }, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`   ✅ DoseLog: ${data.status.toUpperCase()} — ${(await Medication.findById(data.medicationId))?.name} @ ${data.scheduledDate}`);
  }

  // ── 5. Adherence Stats ────────────────────────────────────────────────────
  console.log('\n📊 Creating adherence stats...');

  const stats = await AdherenceStats.findOneAndUpdate(
    { userId: user._id, date: '2026-05-12' },
    {
      $setOnInsert: {
        userId: user._id,
        date: '2026-05-12',
        totalDoses: 5,
        takenDoses: 4,
        missedDoses: 1,
        skippedDoses: 0,
        adherenceRate: 80,
        streakDay: 12,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`   ✅ AdherenceStats: ${stats.adherenceRate}% adherence on ${stats.date}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('🎉 Seed complete! Login credentials:');
  console.log('   📧 Email   : sunita@gmail.com');
  console.log('   🔑 Password: Sunita@123');
  console.log('   🆔 User ID : ' + user._id);
  console.log('─'.repeat(50) + '\n');
}

// ─── Run ──────────────────────────────────────────────────────────────────────
connect()
  .then(seed)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  });
