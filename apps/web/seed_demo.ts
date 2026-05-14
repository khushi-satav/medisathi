import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medisaathi';

// Define minimal schemas if we want to run this standalone, or just import models.
// Let's import models since we have ts-node/tsx.
// We will use mongoose directly here to avoid ts path alias issues if running raw.

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'patient' },
  age: Number,
  gender: String,
  conditions: Array,
  isVerified: { type: Boolean, default: true }
});

const medicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  dosage: String,
  form: String,
  condition: String,
  color: String,
  times: [String],
  foodInstruction: String,
  startDate: Date,
  isActive: { type: Boolean, default: true },
  stockCount: Number,
  refillAlertDays: Number
});

const doseLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  medicationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  scheduledTime: Date,
  scheduledDate: String,
  takenAt: Date,
  status: String
});

const adherenceStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: String,
  totalDoses: Number,
  takenDoses: Number,
  missedDoses: Number,
  skippedDoses: Number,
  adherenceRate: Number
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Medication = mongoose.models.Medication || mongoose.model('Medication', medicationSchema);
const DoseLog = mongoose.models.DoseLog || mongoose.model('DoseLog', doseLogSchema);
const AdherenceStats = mongoose.models.AdherenceStats || mongoose.model('AdherenceStats', adherenceStatsSchema);

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const email = 'demo@medisathi.com';
  const password = 'password123';

  // Clean up old demo data
  const oldUser = await User.findOne({ email });
  if (oldUser) {
    await Medication.deleteMany({ userId: oldUser._id });
    await DoseLog.deleteMany({ userId: oldUser._id });
    await AdherenceStats.deleteMany({ userId: oldUser._id });
    await User.deleteOne({ email });
  }

  // 1. Create User
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: 'Demo Patient',
    email,
    passwordHash,
    age: 45,
    gender: 'female',
    role: 'patient',
    conditions: [{ name: 'Hypertension' }, { name: 'Diabetes' }],
    isVerified: true
  });
  console.log(`Created user: ${email}`);

  // 2. Create Medications (from datasets: Amlodipine for Hypertension, Metformin for Diabetes)
  const med1 = await Medication.create({
    userId: user._id,
    name: 'Metformin',
    dosage: '500mg',
    form: 'tablet',
    condition: 'Diabetes',
    color: '#3B82F6',
    times: ['08:00', '20:00'],
    foodInstruction: 'after_meal',
    startDate: new Date('2026-01-01'),
    stockCount: 45,
    refillAlertDays: 7
  });

  const med2 = await Medication.create({
    userId: user._id,
    name: 'Amlodipine',
    dosage: '5mg',
    form: 'tablet',
    condition: 'Hypertension',
    color: '#EF4444',
    times: ['08:00'],
    foodInstruction: 'after_meal',
    startDate: new Date('2026-01-01'),
    stockCount: 15,
    refillAlertDays: 7
  });
  console.log('Created medications');

  // 3. Create Dose Logs & Stats for the last 7 days + today
  const meds = [med1, med2];
  const today = new Date();
  
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    let totalDoses = 0;
    let takenDoses = 0;
    let missedDoses = 0;

    for (const med of meds) {
      for (const time of med.times) {
        totalDoses++;
        const [h, m] = time.split(':').map(Number);
        const scheduledTime = new Date(d);
        scheduledTime.setHours(h, m, 0, 0);

        // Determine status (mostly taken, some missed)
        let status = 'taken';
        if (i > 0 && Math.random() < 0.15) {
          status = 'missed';
        }
        
        // For today, if it's in the future, it's upcoming
        if (i === 0 && scheduledTime > new Date()) {
           status = 'pending';
           totalDoses--; // exclude from stats if upcoming
           continue; 
        }

        if (status === 'taken') takenDoses++;
        if (status === 'missed') missedDoses++;

        await DoseLog.create({
          userId: user._id,
          medicationId: med._id,
          scheduledTime,
          scheduledDate: dateStr,
          takenAt: status === 'taken' ? scheduledTime : undefined,
          status
        });
      }
    }

    if (totalDoses > 0) {
      const adherenceRate = Math.round((takenDoses / totalDoses) * 100);
      await AdherenceStats.create({
        userId: user._id,
        date: dateStr,
        totalDoses,
        takenDoses,
        missedDoses,
        skippedDoses: 0,
        adherenceRate
      });
    }
  }
  
  console.log('Created dose logs and adherence stats');
  console.log('\n--- DEMO CREDENTIALS ---');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('------------------------');

  mongoose.connection.close();
}

seed().catch(console.error);
