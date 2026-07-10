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

const ESCALATION_TRANSLATIONS: Record<string, {
  missedPushTitle: (medName: string) => string;
  missedPushBody: (medName: string, dosage: string, time: string) => string;
  missedSms: (patientName: string, medName: string, dosage: string, time: string) => string;
  missedCall: (patientName: string, medName: string, time: string) => string;
  caregiverSms: (patientName: string, medName: string, dosage: string, time: string) => string;
  caregiverPushTitle: (patientName: string) => string;
  caregiverPushBody: (patientName: string, medName: string, dosage: string, time: string) => string;
  emergencySms: (contactName: string, patientName: string, medName: string, dosage: string, time: string) => string;
}> = {
  en: {
    missedPushTitle: (m) => `Missed Medication: ${m}`,
    missedPushBody: (m, d, t) => `You missed your scheduled dose of ${m} (${d}) at ${t}. Please take it as soon as possible.`,
    missedSms: (p, m, d, t) => `MediSaathi Reminder: Hello ${p}, you missed your dose of ${m} (${d}) scheduled at ${t}. Please take it now.`,
    missedCall: (p, m, t) => `Hello ${p}. This is an urgent reminder from MediSaathi. You missed your scheduled dose of ${m} at ${t}. Please take your medication immediately.`,
    caregiverSms: (p, m, d, t) => `MediSaathi Caregiver Alert: Patient ${p} missed their dose of ${m} (${d}) scheduled at ${t} and has not responded to reminders.`,
    caregiverPushTitle: (p) => `Caregiver Alert: ${p} missed medication`,
    caregiverPushBody: (p, m, d, t) => `${p} missed their dose of ${m} (${d}) scheduled at ${t} and has not taken it yet.`,
    emergencySms: (c, p, m, d, t) => `MediSaathi EMERGENCY Alert: ${c}, your emergency contact ${p} has missed their dose of ${m} (${d}) scheduled at ${t}. They have not responded to patient or caregiver reminders for 2 hours. Please check on them immediately.`
  },
  hi: {
    missedPushTitle: (m) => `छूटी हुई दवा: ${m}`,
    missedPushBody: (m, d, t) => `आप ${t} पर ${m} (${d}) की अपनी निर्धारित खुराक लेना भूल गए। कृपया इसे जल्द से जल्द लें।`,
    missedSms: (p, m, d, t) => `मेडिसाथी रिमाइंडर: नमस्कार ${p}, आप ${t} पर निर्धारित ${m} (${d}) की अपनी खुराक लेना भूल गए। कृपया इसे अभी लें।`,
    missedCall: (p, m, t) => `नमस्कार ${p}। यह मेडिसाथी से एक जरूरी अनुस्मारक है। आप ${t} पर ${m} की अपनी निर्धारित खुराक लेना भूल गए। कृपया अपनी दवा तुरंत लें।`,
    caregiverSms: (p, m, d, t) => `मेडिसाथी केयरगिवर अलर्ट: मरीज ${p} ${t} पर निर्धारित ${m} (${d}) की अपनी खुराक लेना भूल गए हैं और अनुस्मारक का जवाब नहीं दिया है।`,
    caregiverPushTitle: (p) => `केयरगिवर अलर्ट: ${p} दवा लेना भूल गए`,
    caregiverPushBody: (p, m, d, t) => `${p} ${t} पर निर्धारित ${m} (${d}) की अपनी खुराक लेना भूल गए हैं और अभी तक इसे नहीं लिया है।`,
    emergencySms: (c, p, m, d, t) => `मेडिसाथी आपातकालीन अलर्ट: ${c}, आपके आपातकालीन संपर्क ${p} ${t} पर निर्धारित ${m} (${d}) की अपनी खुराक लेना भूल गए हैं। उन्होंने 2 घंटे से किसी रिमाइंडर का जवाब नहीं दिया है। कृपया तुरंत उनकी जांच करें।`
  },
  mr: {
    missedPushTitle: (m) => `चुकलेले औषध: ${m}`,
    missedPushBody: (m, d, t) => `तुम्ही ${t} वाजताची ${m} (${d}) ची तुमची नियोजित वेळ चुकवली आहे. कृपया लवकरात लवकर औषध घ्या.`,
    missedSms: (p, m, d, t) => `मेडीसाथी रिमाइंडर: नमस्कार ${p}, तुम्ही ${t} वाजताची ${m} (${d}) ची तुमची औषधाची मात्रा घ्यायला विसरलात. कृपया आताच घ्या.`,
    missedCall: (p, m, t) => `नमस्कार ${p}. मेडीसाथी कडून हा एक तातडीचा संदेश आहे. तुम्ही ${t} वाजताची ${m} ची तुमची नियोजित मात्रा चुकवली आहे. कृपया तुमचे औषध त्वरित घ्या.`,
    caregiverSms: (p, m, d, t) => `मेडीसाथी केअरगिव्हर अलर्ट: रुग्ण ${p} ${t} वाजताची ${m} (${d}) ची मात्रा चुकवली आहे आणि प्रतिसादाला उत्तर दिले नाही.`,
    caregiverPushTitle: (p) => `केअरगिव्हर अलर्ट: ${p} औषध चुकवले`,
    caregiverPushBody: (p, m, d, t) => `${p} हे ${t} वाजताची ${m} (${d}) ची मात्रा चुकवली आहे आणि अद्याप औषध घेतलेले नाही.`,
    emergencySms: (c, p, m, d, t) => `मेडीसाथी इमर्जन्सी अलर्ट: ${c}, आपले संपर्क रुग्ण ${p} ${t} वाजताची ${m} (${d}) ची मात्रा चुकवली आहे. त्यांनी २ तास कोणत्याही रिमांडरला प्रतिसाद दिला नाही. कृपया त्वरित तपासणी करा.`
  },
  ta: {
    missedPushTitle: (m) => `தவறிய மருந்து: ${m}`,
    missedPushBody: (m, d, t) => `நீங்கள் ${t} மணிக்கு திட்டமிடப்பட்ட ${m} (${d}) மருந்தின் அளவை எடுத்துக்கொள்ளத் தவறிவிட்டீர்கள். தயவுசெய்து விரைவாக எடுத்துக்கொள்ளவும்.`,
    missedSms: (p, m, d, t) => `மேடிசாதி நினைவூட்டல்: வணக்கம் ${p}, ${t} மணிக்கு திட்டமிடப்பட்ட ${m} (${d}) மருந்தின் அளவை எடுத்துக்கொள்ள மறந்துவிட்டீர்கள். தயவுசெய்து இப்போது எடுத்துக்கொள்ளவும்.`,
    missedCall: (p, m, t) => `வணக்கம் ${p}. இது மேடிசாதியின் அவசர நினைவூட்டல். ${t} மணிக்கு திட்டமிடப்பட்ட ${m} மருந்தின் அளவை நீங்கள் தவறிவிட்டீர்கள். தயவுசெய்து மருந்தை உடனே எடுத்துக்கொள்ளவும்.`,
    caregiverSms: (p, m, d, t) => `மேடிசாதி பராமரிப்பாளர் எச்சரிக்கை: நோயாளி ${p} ${t} மணிக்கு திட்டமிடப்பட்ட ${m} (${d}) மருந்தின் அளவை எடுத்துக்கொள்ளவில்லை, மேலும் நினைவూட்டல்களுக்கு பதிலளிக்கவில்லை.`,
    caregiverPushTitle: (p) => `பராமரிப்பாளர் எச்சரிக்கை: ${p} மருந்தை எடுத்துக்கொள்ளத் தவறிவிட்டார்`,
    caregiverPushBody: (p, m, d, t) => `${p} ${t} மணிக்கு திட்டமிடப்பட்ட ${m} (${d}) மருந்தின் அளவை இன்னும் எடுத்துக்கொள்ளவில்லை.`,
    emergencySms: (c, p, m, d, t) => `மேடிசாதி அவசர எச்சரிக்கை: ${c}, உங்கள் அவசர தொடர்பு நিয়ার ${p} ${t} மணிக்கு திட்டமிடப்பட்ட ${m} (${d}) மருந்தின் அளவை தவறிவிட்டார். 2 மணி நேரமாக அவர்கள் பதிலளிக்கவில்லை. தயవుசெய்து உடனே சரிபார்க்கவும்.`
  },
  te: {
    missedPushTitle: (m) => `మిస్ అయిన మందు: ${m}`,
    missedPushBody: (m, d, t) => `మీరు ${t} గంటలకు తీసుకోవలసిన ${m} (${d}) మోతాదును మిస్ అయ్యారు. దయచేసి వీలైనంత త్వరగా తీసుకోండి.`,
    missedSms: (p, m, d, t) => `మెడిసాథి రిమైండర్: హలో ${p}, మీరు ${t} గంటలకు తీసుకోవలసిన ${m} (${d}) మోతాదును మిస్ అయ్యారు. దయచేసి ఇప్పుడు తీసుకోండి.`,
    missedCall: (p, m, t) => `హలో ${p}. ఇది మెడిసాథి నుండి అత్యవసర రిమైండర్. మీరు ${t} గంటలకు తీసుకోవలసిన ${m} మోతాదును మిస్ అయ్యారు. దయచేసి వెంటనే మందు తీసుకోండి.`,
    caregiverSms: (p, m, d, t) => `మెడిసాథి కేర్ గివర్ అలర్ట్: రోగి ${p} ${t} గంటలకు తీసుకోవలసిన ${m} (${d}) మోతాదును తీసుకోలేదు మరియు రిమైండర్‌లకు స్పందించలేదు.`,
    caregiverPushTitle: (p) => `కేర్ గివర్ అలర్ట్: ${p} మందు తీసుకోలేదు`,
    caregiverPushBody: (p, m, d, t) => `${p} ${t} గంటలకు తీసుకోవలసిన ${m} (${d}) మోతాదును ఇంకా తీసుకోలేదు.`,
    emergencySms: (c, p, m, d, t) => `మెడిసాథి అత్యవసర అలర్ట్: ${c}, మీ అత్యవసర సంప్రదింపు వ్యక్తి ${p} ${t} గంటలకు తీసుకోవలసిన ${m} (${d}) మోతాదును మిస్ అయ్యారు. వారు 2 గంటలుగా స్పందించడం లేదు. దయచేసి వెంటనే పరిశీలించండి.`
  },
  bn: {
    missedPushTitle: (m) => `বাদ পড়া ওষুধ: ${m}`,
    missedPushBody: (m, d, t) => `আপনি ${t} সময়ের ${m} (${d}) ওষুধের নির্ধারিত ডোজ নিতে ভুলে গেছেন। দয়া করে এটি যত দ্রুত সম্ভব নিয়ে নিন।`,
    missedSms: (p, m, d, t) => `মেডিসাথী রিমাইন্ডার: নমস্কার ${p}, আপনি ${t} সময়ের নির্ধারিত ${m} (${d}) ওষুধের ডোজ নিতে ভুলে গেছেন। দয়া করে এটি এখনই নিয়ে নিন।`,
    missedCall: (p, m, t) => `নমস্কার ${p}। মেডিসাথী থেকে এটি একটি জরুরি রিমাইন্ডার। আপনি ${t} সময়ের ${m} ওষুধের ডোজ নিতে ভুলে গেছেন। দয়া করে আপনার ওষুধ এখনই নিয়ে নিন।`,
    caregiverSms: (p, m, d, t) => `মেডিসাথী কেয়ারগিভার অ্যালার্ট: রোগী ${p} ${t} সময়ের নির্ধারিত ${m} (${d}) ওষুধের ডোজ নিতে ভুলে গেছেন এবং কোনো উত্তর দেননি।`,
    caregiverPushTitle: (p) => `কেয়ারগিভার অ্যালার্ট: ${p} ওষুধ নিতে ভুলে গেছেন`,
    caregiverPushBody: (p, m, d, t) => `${p} ${t} সময়ের নির্ধারিত ${m} (${d}) ওষুধের ডোজ নিতে ভুলে গেছেন এবং এখনো নেননি।`,
    emergencySms: (c, p, m, d, t) => `মেডিসাথী ইমার্জেন্সি অ্যালার্ট: ${c}, আপনার জরুরি যোগাযোগ ${p} ${t} সময়ের নির্ধারিত ${m} (${d}) ওষুধের ডোজ নিতে ভুলে গেছেন। তারা ২ ঘণ্টা ধরে কোনো সাড়া দেননি। দয়া করে এখনই তাদের খোঁজ নিন।`
  }
};

export async function executeEscalationStep(escalation: any, step: 't0' | 't15' | 't30' | 't60' | 't120') {
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

  const lang = patient.language || 'en';
  const t = ESCALATION_TRANSLATIONS[lang] || ESCALATION_TRANSLATIONS['en'];

  console.log(`Executing step ${step} in language "${lang}" for Patient: ${patient.name}, Med: ${medication.name}`);

  try {
    switch (step) {
      case 't0': {
        // T+0: Push notification (FCM) to the Patient
        const title = t.missedPushTitle(medication.name);
        const body = t.missedPushBody(medication.name, medication.dosage, formattedTime);
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
          const body = t.missedSms(patient.name, medication.name, medication.dosage, formattedTime);
          await sendSMS(patient.phone, body);
        } else {
          console.log(`Patient ${patient.name} has no phone number. Skipping SMS.`);
        }
        break;
      }
      case 't30': {
        // T+30m: Phone Call via Twilio to the Patient
        if (patient.phone) {
          const message = t.missedCall(patient.name, medication.name, formattedTime);
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
              const cLang = caregiver.language || lang;
              const ct = ESCALATION_TRANSLATIONS[cLang] || ESCALATION_TRANSLATIONS['en'];

              // Send SMS to caregiver
              if (caregiver.phone) {
                const smsBody = ct.caregiverSms(patient.name, medication.name, medication.dosage, formattedTime);
                await sendSMS(caregiver.phone, smsBody);
              }
              // Send Push Notification (FCM) to caregiver
              const title = ct.caregiverPushTitle(patient.name);
              const body = ct.caregiverPushBody(patient.name, medication.name, medication.dosage, formattedTime);
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
          const body = t.emergencySms(primaryContact.name, patient.name, medication.name, medication.dosage, formattedTime);
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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function buildScheduledTimeIST(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcMidnightOfISTDate = Date.UTC(year, month - 1, day) - IST_OFFSET_MS;
  return new Date(utcMidnightOfISTDate + hours * 3600000 + minutes * 60000);
}

function getTodayIST(): string {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return istNow.toISOString().split('T')[0];
}

export async function recalculateStats(userId: string, dateString: string) {
  try {
    const medications = await Medication.find({ userId, isActive: true });
    const dayLogs = await DoseLog.find({ userId, scheduledDate: dateString });

    const logMap = new Map(
      dayLogs.map(log => [`${log.medicationId}-${new Date(log.scheduledTime).toISOString()}`, log])
    );

    const nowUTC = new Date();
    const isToday = dateString === getTodayIST();

    let totalDoses = 0;
    let takenDoses = 0;
    let missedDoses = 0;
    let skippedDoses = 0;

    for (const med of medications) {
      if (med.startDate) {
        const medStartStr = new Date(med.startDate).toISOString().split('T')[0];
        if (medStartStr > dateString) continue;
      }
      if (med.endDate) {
        const medEndStr = new Date(med.endDate).toISOString().split('T')[0];
        if (dateString > medEndStr) continue;
      }

      for (const time of med.times) {
        const scheduledTime = buildScheduledTimeIST(dateString, time);
        const logKey = `${med._id}-${scheduledTime.toISOString()}`;
        const existingLog = logMap.get(logKey);

        let status: string;
        if (existingLog) {
          status = existingLog.status;
        } else if (scheduledTime < nowUTC) {
          status = isToday ? 'overdue' : 'missed';
        } else {
          status = 'upcoming';
        }

        totalDoses++;
        if (status === 'taken') {
          takenDoses++;
        } else if (status === 'skipped') {
          skippedDoses++;
        } else if (status === 'missed' || status === 'overdue') {
          missedDoses++;
        }
      }
    }

    const pastDoses = takenDoses + missedDoses + skippedDoses;
    const adherenceRate = pastDoses > 0 ? Math.round((takenDoses / pastDoses) * 100) : 0;

    await AdherenceStats.findOneAndUpdate(
      { userId, date: dateString },
      { totalDoses, takenDoses, missedDoses, skippedDoses, adherenceRate },
      { upsert: true }
    );
    console.log(`[recalculateStats] User: ${userId}, Date: ${dateString}, Total: ${totalDoses}, Taken: ${takenDoses}, Missed: ${missedDoses}, Skipped: ${skippedDoses}, Rate: ${adherenceRate}%`);
  } catch (err) {
    console.error(`Error recalculating stats for user ${userId} on date ${dateString}:`, err);
  }
}

