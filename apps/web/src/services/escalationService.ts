/* eslint-disable @typescript-eslint/no-explicit-any */
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import Medication from '@/models/Medication';
import DoseLog from '@/models/DoseLog';
import AdherenceStats from '@/models/AdherenceStats';
import EscalationState from '@/models/EscalationState';
import { sendPushNotification, sendSMS, makePhoneCall } from '@/lib/notificationHelper';

export async function createEscalation(
  patientId: string,
  medicationId: string,
  doseLogId: string,
  scheduledTime: Date
) {
  await connectDB();

  // If there's already an active escalation for this dose, don't duplicate it
  const existing = await EscalationState.findOne({ doseLogId });
  if (existing) {
    return existing;
  }

  const escalation = await EscalationState.create({
    userId: patientId,
    medicationId,
    doseLogId,
    status: 'active',
    missedAt: scheduledTime,
    currentStep: 't0',
    stepsSent: [],
  });

  console.log(`Created escalation for patient ${patientId}, doseLog ${doseLogId}`);

  // Run T+0 step immediately
  await executeEscalationStep(escalation, 't0');

  return escalation;
}

export async function resolveEscalation(doseLogId: string) {
  await connectDB();
  const escalation = await EscalationState.findOneAndUpdate(
    { doseLogId, status: 'active' },
    { status: 'resolved' },
    { returnDocument: 'after' }
  );
  if (escalation) {
    console.log(`Resolved active escalation for doseLogId: ${doseLogId}`);
  }
}

export async function processActiveEscalations() {
  await connectDB();

  const activeEscalations = await EscalationState.find({ status: 'active' });
  console.log(`Processing ${activeEscalations.length} active escalations...`);

  const now = new Date();

  for (const esc of activeEscalations) {
    try {
      const elapsedMs = now.getTime() - esc.missedAt.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

      console.log(`Escalation ${esc._id}: ${elapsedMinutes} minutes elapsed since dose time.`);

      // Check steps sequentially and trigger if appropriate
      if (elapsedMinutes >= 120 && !esc.stepsSent.includes('t120')) {
        await executeEscalationStep(esc, 't120');
      } else if (elapsedMinutes >= 60 && !esc.stepsSent.includes('t60')) {
        await executeEscalationStep(esc, 't60');
      } else if (elapsedMinutes >= 30 && !esc.stepsSent.includes('t30')) {
        await executeEscalationStep(esc, 't30');
      } else if (elapsedMinutes >= 15 && !esc.stepsSent.includes('t15')) {
        await executeEscalationStep(esc, 't15');
      }
    } catch (err) {
      console.error(`Error processing escalation ${esc._id}:`, err);
    }
  }
}

async function executeEscalationStep(escalation: any, step: 't0' | 't15' | 't30' | 't60' | 't120') {
  const patient = await User.findById(escalation.userId);
  const medication = await Medication.findById(escalation.medicationId);

  if (!patient || !medication) {
    console.error(`Patient or Medication not found for escalation: ${escalation._id}`);
    return;
  }

  const formattedTime = escalation.missedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: patient.timezone || 'Asia/Kolkata',
  });

  console.log(`Executing step ${step} for Patient: ${patient.name}, Med: ${medication.name}`);

  try {
    switch (step) {
      case 't0': {
        // T+0: Push notification (FCM) to the Patient
        const title = `Missed Medication: ${medication.name}`;
        const body = `You missed your scheduled dose of ${medication.name} (${medication.dosage}) at ${formattedTime}. Please take it as soon as possible.`;
        await sendPushNotification(patient._id.toString(), 'DOSE_MISSED', title, body, {
          escalationId: escalation._id.toString(),
          medicationId: medication._id.toString(),
          doseLogId: escalation.doseLogId.toString(),
        });
        break;
      }
      case 't15': {
        // T+15m: SMS via Twilio to the Patient
        if (patient.phone) {
          const body = `MediSaathi Reminder: Hello ${patient.name}, you missed your dose of ${medication.name} (${medication.dosage}) scheduled at ${formattedTime}. Please take it now.`;
          await sendSMS(patient.phone, body);
        } else {
          console.log(`Patient ${patient.name} has no phone number. Skipping SMS.`);
        }
        break;
      }
      case 't30': {
        // T+30m: Phone Call via Twilio to the Patient
        if (patient.phone) {
          const message = `Hello ${patient.name}. This is an urgent reminder from MediSaathi. You missed your scheduled dose of ${medication.name} at ${formattedTime}. Please take your medication immediately.`;
          await makePhoneCall(patient.phone, message);
        } else {
          console.log(`Patient ${patient.name} has no phone number. Skipping phone call.`);
        }
        break;
      }
      case 't60': {
        // T+60m: Caregiver SMS + Push
        // Find patient's active caregivers
        const activeCaregivers = patient.caregiverLinks?.filter((link: any) => link.isActive) || [];
        if (activeCaregivers.length > 0) {
          for (const link of activeCaregivers) {
            const caregiver = await User.findById(link.userId);
            if (caregiver) {
              // Send SMS to caregiver
              if (caregiver.phone) {
                const smsBody = `MediSaathi Caregiver Alert: Patient ${patient.name} missed their dose of ${medication.name} (${medication.dosage}) scheduled at ${formattedTime} and has not responded to reminders.`;
                await sendSMS(caregiver.phone, smsBody);
              }
              // Send Push Notification (FCM) to caregiver
              const title = `Caregiver Alert: ${patient.name} missed medication`;
              const body = `${patient.name} missed their dose of ${medication.name} (${medication.dosage}) scheduled at ${formattedTime} and has not taken it yet.`;
              await sendPushNotification(caregiver._id.toString(), 'CAREGIVER_ALERT', title, body, {
                escalationId: escalation._id.toString(),
                patientId: patient._id.toString(),
                medicationId: medication._id.toString(),
                doseLogId: escalation.doseLogId.toString(),
              });
            }
          }
        } else {
          console.log(`Patient ${patient.name} has no active caregiver links.`);
        }
        break;
      }
      case 't120': {
        // T+2hr: Emergency Contact SMS
        const primaryContact = patient.emergencyContacts?.find((c: any) => c.isPrimary) || patient.emergencyContacts?.[0];
        if (primaryContact && primaryContact.phone) {
          const body = `MediSaathi EMERGENCY Alert: ${primaryContact.name}, your emergency contact ${patient.name} has missed their dose of ${medication.name} (${medication.dosage}) scheduled at ${formattedTime}. They have not responded to patient or caregiver reminders for 2 hours. Please check on them immediately.`;
          await sendSMS(primaryContact.phone, body);
        } else {
          console.log(`Patient ${patient.name} has no emergency contact phone number. Skipping emergency SMS.`);
        }
        break;
      }
    }

    // Update steps sent in database
    escalation.stepsSent.push(step);
    if (step === 't0') escalation.currentStep = 't15';
    else if (step === 't15') escalation.currentStep = 't30';
    else if (step === 't30') escalation.currentStep = 't60';
    else if (step === 't60') escalation.currentStep = 't120';
    else if (step === 't120') {
      escalation.currentStep = 'done';
      escalation.status = 'failed'; // Finished all escalations without response
    }

    await escalation.save();
    console.log(`Successfully completed step ${step} for escalation ${escalation._id}`);
  } catch (error) {
    console.error(`Error executing step ${step} for escalation ${escalation._id}:`, error);
  }
}

export async function checkAndEscalateMissedDoses() {
  await connectDB();
  const medications = await Medication.find({ isActive: true });
  const now = new Date();

  console.log(`Checking missed doses for ${medications.length} active medications...`);

  for (const med of medications) {
    try {
      const patient = await User.findById(med.userId);
      if (!patient) continue;

      const timeToCheck = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      for (const timeStr of med.times) {
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Check for today
        const scheduledToday = new Date(now);
        scheduledToday.setHours(hours, minutes, 0, 0);

        // Check for yesterday
        const scheduledYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        scheduledYesterday.setHours(hours, minutes, 0, 0);

        const candidateTimes = [scheduledYesterday, scheduledToday];

        for (const scheduledTime of candidateTimes) {
          // Must be between (now - 24 hours) and (now - 5 minutes)
          if (scheduledTime >= timeToCheck && scheduledTime <= new Date(now.getTime() - 5 * 60 * 1000)) {
            // Must be within medication date range
            if (scheduledTime >= med.startDate && (!med.endDate || scheduledTime <= med.endDate)) {
              const dateString = scheduledTime.toISOString().split('T')[0];

              // Check if a DoseLog already exists
              const existingLog = await DoseLog.findOne({
                medicationId: med._id,
                scheduledTime,
              });

              if (!existingLog) {
                console.log(`Dose missed detected: Patient ${patient.name}, Med: ${med.name} at ${scheduledTime.toISOString()}`);
                // Create dose log
                const log = await DoseLog.create({
                  userId: patient._id,
                  medicationId: med._id,
                  scheduledDate: dateString,
                  scheduledTime,
                  status: 'missed',
                });

                // Recalculate stats for patient on that date
                await recalculateStats(patient._id.toString(), dateString);

                // Start escalation
                await createEscalation(patient._id.toString(), med._id.toString(), log._id.toString(), scheduledTime);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error checking missed doses for medication ${med._id}:`, err);
    }
  }
}

async function recalculateStats(userId: string, dateString: string) {
  try {
    const dayLogs = await DoseLog.find({ userId, scheduledDate: dateString });
    const totalDoses = dayLogs.length;
    const takenDoses = dayLogs.filter(l => l.status === 'taken').length;
    const missedDoses = dayLogs.filter(l => l.status === 'missed').length;
    const skippedDoses = dayLogs.filter(l => l.status === 'skipped').length;
    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    await AdherenceStats.findOneAndUpdate(
      { userId, date: dateString },
      { totalDoses, takenDoses, missedDoses, skippedDoses, adherenceRate },
      { upsert: true }
    );
  } catch (err) {
    console.error(`Error recalculating stats for user ${userId} on date ${dateString}:`, err);
  }
}
