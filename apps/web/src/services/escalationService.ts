/* eslint-disable @typescript-eslint/no-explicit-any */
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import Medication from '@/models/Medication';
import DoseLog from '@/models/DoseLog';
import AdherenceStats from '@/models/AdherenceStats';
import EscalationState from '@/models/EscalationState';
import CronRunLog from '@/models/CronRunLog';
import { sendPushNotification, sendSMS, makePhoneCall } from '@/lib/notificationHelper';
import { getEffectiveEscalationLevel } from '@/lib/escalationClassification';

// ── First-run / backlog safety ──────────────────────────────────────────────
// checkAndEscalateMissedDoses() looks back up to 24h. Its first-ever
// execution against real data (or any run after a cron outage) can detect a
// large number of unlogged overdue doses in one pass. Two independent
// protections, both always active (not just when a backlog is detected —
// the danger below exists for a single stale miss too, not only bulk ones):
//
//   1. RECENCY CUTOFF — an escalation is only ever STARTED for a dose that
//      became due within the last ESCALATION_RECENCY_CUTOFF_MINUTES. A dose
//      already older than that still gets its DoseLog + AdherenceStats
//      recalculated (adherence accuracy is unaffected), it just never
//      starts a notification chain. Why this matters even for a single
//      stale miss, not just bulk backfills: createEscalation() always fires
//      t0 immediately, but processActiveEscalations() computes elapsed time
//      from the ORIGINAL scheduled time, not from when the escalation was
//      created — so an escalation started for a dose that's already, say,
//      70 minutes overdue would jump straight to firing t60 (caregiver
//      alert) on the very next cron tick, having skipped t15/t30 entirely.
//      15 minutes keeps that from ever happening: under normal 5-minute
//      cron cadence a fresh miss is always detected within ~5-10 minutes of
//      becoming overdue, well inside the cutoff, so this never affects
//      steady-state operation — it only suppresses escalation-starting for
//      genuinely stale detections (first run, or a cron gap).
//   2. PER-USER RATE CAP — even within the recency window, no single user
//      can have more than ESCALATION_RATE_CAP_PER_USER escalations started
//      against them in one run (e.g. several medications all scheduled in
//      the same 15-minute window). Doses beyond the cap still get their
//      DoseLog recorded; they just don't also start a notification chain in
//      this run — a future dose for that same medication will escalate
//      normally next time it's missed.
//
// isFirstRun / isLargeBacklog below are informational signals only (surfaced
// in the run log so you can see when a run looks like a catch-up), not
// separate gates — the two protections above apply on every run.
const ESCALATION_RECENCY_CUTOFF_MINUTES = 15;
const ESCALATION_RATE_CAP_PER_USER = 3;
const LARGE_BACKLOG_THRESHOLD = 10;

/**
 * Starts (or returns the existing) escalation for a missed dose.
 *
 * The escalation level is resolved HERE, once, from the medication's
 * effective classification (see escalationClassification.ts) and snapshotted
 * onto the EscalationState document — every later step reads the snapshot,
 * not the live medication, so changing a medication's configured level
 * mid-flight can't alter an escalation already in progress.
 *
 *   'none'          — no EscalationState is created at all. The missed dose
 *                      is still logged (adherence tracking unaffected); it
 *                      just never becomes a push/SMS/call/caregiver/emergency
 *                      chain. Returns null.
 *   'reminder_only' — t0 push fires, then the escalation is immediately
 *                      capped (status 'capped') so it can never progress to
 *                      t15+.
 *   'full'          — unchanged: complete t0..t120 chain.
 */
export async function createEscalation(
  patientId: string,
  medicationId: string,
  doseLogId: string,
  scheduledTime: Date
) {
  await connectDB();

  // If there's already an escalation for this dose, don't duplicate it.
  // This check is an optimization, not the guarantee — the unique index on
  // EscalationState.doseLogId is the real guarantee. Two concurrent callers
  // (e.g. overlapping cron runs) can both pass this check; only one of the
  // create() calls below will actually succeed.
  const existing = await EscalationState.findOne({ doseLogId });
  if (existing) {
    return existing;
  }

  const medication = await Medication.findById(medicationId);
  const escalationLevel = getEffectiveEscalationLevel(medication ?? {});

  if (escalationLevel === 'none') {
    console.log(`Escalation skipped for doseLog ${doseLogId}: medication ${medicationId} is configured 'none' — dose stays logged as missed, no notifications sent.`);
    return null;
  }

  let escalation;
  try {
    escalation = await EscalationState.create({
      userId: patientId,
      medicationId,
      doseLogId,
      status: 'active',
      missedAt: scheduledTime,
      currentStep: 't0',
      stepsSent: [],
      escalationLevel,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      // Lost the race to another concurrent caller — it already created (and
      // is firing t0 for) this escalation. Return that one; do NOT fire t0
      // again here, or the patient gets a duplicate push notification.
      const winner = await EscalationState.findOne({ doseLogId });
      if (winner) return winner;
    }
    throw err;
  }

  console.log(`Created escalation (level=${escalationLevel}) for patient ${patientId}, doseLog ${doseLogId}`);

  // Run T+0 step immediately. executeEscalationStep() atomically claims the
  // step before sending, so even this first call is idempotent.
  await executeEscalationStep(escalation, 't0');

  if (escalationLevel !== 'full') {
    // By design, not by failure — distinct from 'resolved' (patient
    // responded) and 'failed' (chain exhausted without response).
    await EscalationState.findByIdAndUpdate(escalation._id, { status: 'capped' });
    console.log(`Escalation ${escalation._id} capped after t0 (level=${escalationLevel}) — will not progress to t15+.`);
  }

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
  let stepsSent = 0;
  let errors = 0;

  for (const esc of activeEscalations) {
    try {
      const elapsedMs = now.getTime() - esc.missedAt.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

      console.log(`Escalation ${esc._id}: ${elapsedMinutes} minutes elapsed since dose time.`);

      // Check steps sequentially and trigger the latest one due. The
      // stepsSent.includes() checks here are a cheap pre-filter only — the
      // real idempotency guarantee is the atomic claim inside
      // executeEscalationStep(), which is safe even if two runs of this
      // loop overlap for the same escalation.
      let result: { sent: boolean } | null = null;
      if (elapsedMinutes >= 120 && !esc.stepsSent.includes('t120')) {
        result = await executeEscalationStep(esc, 't120');
      } else if (elapsedMinutes >= 60 && !esc.stepsSent.includes('t60')) {
        result = await executeEscalationStep(esc, 't60');
      } else if (elapsedMinutes >= 30 && !esc.stepsSent.includes('t30')) {
        result = await executeEscalationStep(esc, 't30');
      } else if (elapsedMinutes >= 15 && !esc.stepsSent.includes('t15')) {
        result = await executeEscalationStep(esc, 't15');
      }
      if (result?.sent) stepsSent++;
    } catch (err) {
      errors++;
      console.error(`Error processing escalation ${esc._id}:`, err);
    }
  }

  return { activeEscalations: activeEscalations.length, stepsSent, errors };
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

const NEXT_STEP: Record<string, string> = {
  t0: 't15',
  t15: 't30',
  t30: 't60',
  t60: 't120',
  t120: 'done',
};

/**
 * Sends the notification for one escalation step.
 *
 * Idempotency guard: the step is atomically CLAIMED (via a single
 * findOneAndUpdate that only matches if the step is not already in
 * stepsSent AND the escalation is still 'active') BEFORE any notification
 * is sent. If the claim matches nothing — because another overlapping run
 * already claimed this step, or the escalation was resolved in the
 * meantime by the patient logging the dose — we skip sending entirely.
 * This replaces the previous "send, then record" order, which had a race:
 * two overlapping cron runs could both read stepsSent without the step,
 * both send the SMS/call, and only then both write — i.e. a duplicate
 * alert. Claim-then-send makes the write the exclusive gate on the send.
 */
export async function executeEscalationStep(escalation: any, step: 't0' | 't15' | 't30' | 't60' | 't120'): Promise<{ sent: boolean; reason?: string }> {
  await connectDB();

  const claimed = await EscalationState.findOneAndUpdate(
    { _id: escalation._id, status: 'active', stepsSent: { $ne: step } },
    { $addToSet: { stepsSent: step }, $set: { currentStep: NEXT_STEP[step] } },
    { returnDocument: 'after' }
  );

  if (!claimed) {
    console.log(`Escalation ${escalation._id}: step ${step} already sent or no longer active — skipping.`);
    return { sent: false, reason: 'already-claimed-or-inactive' };
  }

  const patient = await User.findById(escalation.userId);
  const medication = await Medication.findById(escalation.medicationId);

  if (!patient || !medication) {
    console.error(`Patient or Medication not found for escalation: ${escalation._id}`);
    return { sent: false, reason: 'patient-or-medication-missing' };
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

    // step + currentStep were already committed atomically by the claim
    // above. t120 additionally ends the escalation — no further steps
    // exist, so mark it terminal here.
    if (step === 't120') {
      await EscalationState.findByIdAndUpdate(claimed._id, { status: 'failed' });
    }

    console.log(`Successfully completed step ${step} for escalation ${escalation._id}`);
    return { sent: true };
  } catch (error) {
    console.error(`Error executing step ${step} for escalation ${escalation._id}:`, error);
    // The claim above already recorded this step as sent so a concurrent
    // run couldn't double-send while this one was in flight. Since the send
    // actually failed, release the claim so the NEXT run retries it instead
    // of silently skipping this step forever.
    await EscalationState.findByIdAndUpdate(claimed._id, {
      $pull: { stepsSent: step },
      $set: { currentStep: step },
    });
    return { sent: false, reason: 'send-error' };
  }
}

/**
 * A medication with an endDate lingers `isActive: true` forever once its
 * course ends — nothing else in the app flips it. The only existing write
 * to isActive: false is the user-initiated DELETE endpoint
 * (medications/[id]/route.ts). Without this, a lapsed "10 days" antibiotic
 * course would keep generating 'missed' DoseLogs and (pre-classification)
 * escalation chains indefinitely after the patient finished the course.
 *
 * A medication stays scheduled THROUGH its endDate (see getAdherenceWindow),
 * so it's only deactivated once that calendar day has fully passed.
 */
export async function deactivateExpiredMedications(): Promise<number> {
  await connectDB();
  const todayStr = new Date().toISOString().split('T')[0];

  const candidates = await Medication.find({
    isActive: true,
    endDate: { $exists: true, $ne: null },
  });

  const expiredIds = candidates
    .filter((med) => new Date(med.endDate!).toISOString().split('T')[0] < todayStr)
    .map((med) => med._id);

  if (expiredIds.length === 0) return 0;

  await Medication.updateMany({ _id: { $in: expiredIds } }, { isActive: false });
  console.log(`Deactivated ${expiredIds.length} medication(s) whose endDate has passed: ${expiredIds.join(', ')}`);
  return expiredIds.length;
}

export async function checkAndEscalateMissedDoses() {
  await connectDB();

  const deactivatedCount = await deactivateExpiredMedications();

  // Informational only — see the comment above these constants. Checked
  // before the run so "first run" reflects whether this job has EVER
  // completed before, not whether it happens to find anything this time.
  const priorRunCount = await CronRunLog.countDocuments({ jobName: 'check-missed-doses' });
  const isFirstRun = priorRunCount === 0;

  const medications = await Medication.find({ isActive: true });
  const now = new Date();

  console.log(`Checking missed doses for ${medications.length} active medications...${isFirstRun ? ' (first-ever run of this job)' : ''}`);

  let missedDetected = 0;
  let escalationsStarted = 0;
  let escalationsSkippedStale = 0;
  let escalationsRateLimited = 0;
  let errors = 0;
  // Per-user escalation-start count for THIS run only (in-memory, not
  // persisted — resets every invocation by design).
  const escalationsStartedByUser = new Map<string, number>();

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
                // Create dose log. The unique index on
                // {medicationId, scheduledDate, scheduledTime} is the real
                // idempotency guarantee here — this create() can race with
                // another overlapping run past the existingLog check above;
                // if so, Mongo rejects the second insert with E11000 and we
                // just treat it as "someone else already handled this dose".
                let log;
                try {
                  log = await DoseLog.create({
                    userId: patient._id,
                    medicationId: med._id,
                    scheduledDate: dateString,
                    scheduledTime,
                    status: 'missed',
                  });
                } catch (createErr: any) {
                  if (createErr?.code === 11000) {
                    console.log(`Missed-dose log for med ${med._id} at ${scheduledTime.toISOString()} was already created by a concurrent run — skipping.`);
                    continue;
                  }
                  throw createErr;
                }

                console.log(`Dose missed detected: Patient ${patient.name}, Med: ${med.name} at ${scheduledTime.toISOString()}`);
                missedDetected++;

                // Recalculate stats for patient on that date. This ALWAYS
                // happens regardless of the recency/rate guards below —
                // adherence accuracy for a stale or rate-limited miss is not
                // in question, only whether it also starts a notification
                // chain.
                await recalculateStats(patient._id.toString(), dateString);

                // ── Recency cutoff (see comment near the constants above) ──
                const staleMinutes = (now.getTime() - scheduledTime.getTime()) / 60000;
                if (staleMinutes > ESCALATION_RECENCY_CUTOFF_MINUTES) {
                  escalationsSkippedStale++;
                  console.log(`Escalation NOT started for ${med.name} (${patient.name}): dose is ${Math.round(staleMinutes)}min stale, past the ${ESCALATION_RECENCY_CUTOFF_MINUTES}min recency cutoff. Logged as missed only.`);
                  continue;
                }

                // ── Per-user rate cap (see comment near the constants above) ──
                const userKey = patient._id.toString();
                const startedForUser = escalationsStartedByUser.get(userKey) ?? 0;
                if (startedForUser >= ESCALATION_RATE_CAP_PER_USER) {
                  escalationsRateLimited++;
                  console.log(`Escalation NOT started for ${med.name} (${patient.name}): user already hit the ${ESCALATION_RATE_CAP_PER_USER}-per-run cap. Logged as missed only.`);
                  continue;
                }

                // Start escalation (idempotent — see createEscalation). Returns
                // null for escalationLevel 'none' (e.g. topicals) — the missed
                // dose above is still logged for adherence, it just doesn't
                // start a notification chain.
                const escalation = await createEscalation(patient._id.toString(), med._id.toString(), log._id.toString(), scheduledTime);
                if (escalation) {
                  escalationsStarted++;
                  escalationsStartedByUser.set(userKey, startedForUser + 1);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      errors++;
      console.error(`Error checking missed doses for medication ${med._id}:`, err);
    }
  }

  const isLargeBacklog = missedDetected > LARGE_BACKLOG_THRESHOLD;
  if (isFirstRun || isLargeBacklog) {
    console.log(`This run looks like a backfill/catch-up (isFirstRun=${isFirstRun}, missedDetected=${missedDetected} > threshold=${LARGE_BACKLOG_THRESHOLD}=${isLargeBacklog}). Recency cutoff and per-user rate cap applied as always — ${escalationsSkippedStale} escalation(s) skipped as stale, ${escalationsRateLimited} skipped by the rate cap.`);
  }

  return {
    medicationsChecked: medications.length,
    missedDetected,
    escalationsStarted,
    escalationsSkippedStale,
    escalationsRateLimited,
    isFirstRun,
    isLargeBacklog,
    errors,
    deactivatedCount,
  };
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

