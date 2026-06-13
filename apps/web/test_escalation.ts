import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables immediately before any other imports
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function runTests() {
  console.log('🚀 Starting Emergency Escalation System Tests...\n');
  const connectDB = (await import('./src/lib/mongoose')).default;
  const User = (await import('./src/models/User')).default;
  const Medication = (await import('./src/models/Medication')).default;
  const DoseLog = (await import('./src/models/DoseLog')).default;
  const EscalationState = (await import('./src/models/EscalationState')).default;
  const Notification = (await import('./src/models/Notification')).default;
  const {
    createEscalation,
    resolveEscalation,
    processActiveEscalations,
  } = await import('./src/services/escalationService');

  await connectDB();

  // Find patient & caregiver
  const patient = await User.findOne({ email: 'sunita@gmail.com' });
  if (!patient) {
    throw new Error('Test patient Sunita Devi (sunita@gmail.com) not found');
  }

  const caregiver = await User.findOne({ email: 'anil@gmail.com' });
  if (!caregiver) {
    throw new Error('Test caregiver Anil Kumar (anil@gmail.com) not found');
  }

  const medication = await Medication.findOne({ userId: patient._id, name: 'Augmentin' });
  if (!medication) {
    throw new Error('Test medication Augmentin not found for Sunita Devi');
  }

  console.log(`👤 Patient: ${patient.name} (${patient._id})`);
  console.log(`👥 Caregiver: ${caregiver.name} (${caregiver._id})`);
  console.log(`💊 Medication: ${medication.name} (${medication._id})\n`);

  // Clean up existing logs / escalations for this medication to start fresh
  await EscalationState.deleteMany({ userId: patient._id, medicationId: medication._id });
  await DoseLog.deleteMany({ userId: patient._id, medicationId: medication._id });
  await Notification.deleteMany({ userId: { $in: [patient._id, caregiver._id] } });

  console.log('🧹 Cleaned up old dose logs, escalation states, and notifications.');

  // ==========================================
  // 1. T+0 Step: Missed dose creation & Escalation trigger
  // ==========================================
  console.log('\n--- 1. Testing T+0 Step ---');
  const now = new Date();
  const scheduledDate = now.toISOString().split('T')[0];

  const doseLog = await DoseLog.create({
    userId: patient._id,
    medicationId: medication._id,
    scheduledTime: now,
    scheduledDate,
    status: 'missed',
  });

  console.log(`📝 Created Missed DoseLog: ${doseLog._id}`);

  // Trigger escalation
  await createEscalation(patient._id.toString(), medication._id.toString(), doseLog._id.toString(), now);

  // Retrieve escalation
  let esc = await EscalationState.findOne({ doseLogId: doseLog._id });
  if (!esc) {
    throw new Error('EscalationState was not created in the database');
  }

  console.log(`✅ EscalationState created successfully!`);
  console.log(`   - Status: ${esc.status} (expected: active)`);
  console.log(`   - Current Step: ${esc.currentStep} (expected: t15)`);
  console.log(`   - Steps Sent: ${JSON.stringify(esc.stepsSent)} (expected: ["t0"])`);

  if (esc.status !== 'active' || esc.currentStep !== 't15' || !esc.stepsSent.includes('t0')) {
    throw new Error('Invalid EscalationState after T+0');
  }

  // Check patient notification
  const patientNotif = await Notification.findOne({ userId: patient._id, type: 'DOSE_MISSED' });
  if (!patientNotif) {
    throw new Error('Patient notification not found for T+0');
  }
  console.log(`✅ Patient notification verified: "${patientNotif.title}" - ${patientNotif.body}`);

  // ==========================================
  // 2. T+15 Step: Simulate 15 mins elapsed
  // ==========================================
  console.log('\n--- 2. Testing T+15 Step (SMS) ---');
  // Backdate missedAt to simulate time elapsed
  esc.missedAt = new Date(Date.now() - 16 * 60 * 1000);
  await esc.save();

  console.log('⏳ Simulating 15 minutes elapsed...');
  await processActiveEscalations();

  esc = await EscalationState.findOne({ doseLogId: doseLog._id });
  if (!esc) throw new Error('Escalation state missing');

  console.log(`   - Current Step: ${esc.currentStep} (expected: t30)`);
  console.log(`   - Steps Sent: ${JSON.stringify(esc.stepsSent)} (expected: should include "t15")`);

  if (esc.currentStep !== 't30' || !esc.stepsSent.includes('t15')) {
    throw new Error('T+15 escalation processing failed');
  }

  // ==========================================
  // 3. T+30 Step: Simulate 30 mins elapsed
  // ==========================================
  console.log('\n--- 3. Testing T+30 Step (Caregiver Call) ---');
  esc.missedAt = new Date(Date.now() - 31 * 60 * 1000);
  await esc.save();

  console.log('⏳ Simulating 30 minutes elapsed...');
  await processActiveEscalations();

  esc = await EscalationState.findOne({ doseLogId: doseLog._id });
  if (!esc) throw new Error('Escalation state missing');

  console.log(`   - Current Step: ${esc.currentStep} (expected: t60)`);
  console.log(`   - Steps Sent: ${JSON.stringify(esc.stepsSent)} (expected: should include "t30")`);

  if (esc.currentStep !== 't60' || !esc.stepsSent.includes('t30')) {
    throw new Error('T+30 escalation processing failed');
  }

  // ==========================================
  // 4. T+60 Step: Simulate 60 mins elapsed
  // ==========================================
  console.log('\n--- 4. Testing T+60 Step (Caregiver App Alert) ---');
  esc.missedAt = new Date(Date.now() - 61 * 60 * 1000);
  await esc.save();

  console.log('⏳ Simulating 60 minutes elapsed...');
  await processActiveEscalations();

  esc = await EscalationState.findOne({ doseLogId: doseLog._id });
  if (!esc) throw new Error('Escalation state missing');

  console.log(`   - Current Step: ${esc.currentStep} (expected: t120)`);
  console.log(`   - Steps Sent: ${JSON.stringify(esc.stepsSent)} (expected: should include "t60")`);

  if (esc.currentStep !== 't120' || !esc.stepsSent.includes('t60')) {
    throw new Error('T+60 escalation processing failed');
  }

  // Check caregiver notification
  const caregiverNotif = await Notification.findOne({ userId: caregiver._id, type: 'CAREGIVER_ALERT' });
  if (!caregiverNotif) {
    throw new Error('Caregiver notification not found for T+60');
  }
  console.log(`✅ Caregiver notification verified: "${caregiverNotif.title}" - ${caregiverNotif.body}`);

  // ==========================================
  // 5. T+120 Step: Simulate 120 mins elapsed (failure state)
  // ==========================================
  console.log('\n--- 5. Testing T+120 Step (Emergency Call & Failure) ---');
  esc.missedAt = new Date(Date.now() - 121 * 60 * 1000);
  await esc.save();

  console.log('⏳ Simulating 120 minutes elapsed...');
  await processActiveEscalations();

  esc = await EscalationState.findOne({ doseLogId: doseLog._id });
  if (!esc) throw new Error('Escalation state missing');

  console.log(`   - Status: ${esc.status} (expected: failed)`);
  console.log(`   - Current Step: ${esc.currentStep} (expected: done)`);
  console.log(`   - Steps Sent: ${JSON.stringify(esc.stepsSent)} (expected: should include "t120")`);

  if (esc.status !== 'failed' || esc.currentStep !== 'done' || !esc.stepsSent.includes('t120')) {
    throw new Error('T+120 escalation processing failed');
  }

  // ==========================================
  // 6. Test Resolution / Cancellation
  // ==========================================
  console.log('\n--- 6. Testing Resolution / Cancellation ---');
  const resolutionDoseLog = await DoseLog.create({
    userId: patient._id,
    medicationId: medication._id,
    scheduledTime: new Date(),
    scheduledDate,
    status: 'missed',
  });

  // Start new escalation
  await createEscalation(patient._id.toString(), medication._id.toString(), resolutionDoseLog._id.toString(), new Date());
  
  let newEsc = await EscalationState.findOne({ doseLogId: resolutionDoseLog._id });
  if (!newEsc || newEsc.status !== 'active') {
    throw new Error('Failed to create new active escalation for resolution test');
  }
  console.log('✅ Created fresh active escalation.');

  // Resolve escalation
  await resolveEscalation(resolutionDoseLog._id.toString());

  newEsc = await EscalationState.findOne({ doseLogId: resolutionDoseLog._id });
  if (!newEsc) throw new Error('Resolution escalation state missing');

  console.log(`   - Status: ${newEsc.status} (expected: resolved)`);
  
  if (newEsc.status !== 'resolved') {
    throw new Error('Escalation resolution failed');
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  mongoose.connection.close();
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  mongoose.connection.close();
  process.exit(1);
});
