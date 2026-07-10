/**
 * SMS Templates — server-side message library.
 * All SMS bodies live here so message copy is never scattered across route files.
 * To add Hindi (hi), Marathi (mr), etc. templates, duplicate the 'en' object below.
 *
 * Usage:
 *   import { getSmsTemplates } from '@/lib/smsTemplates';
 *   const t = getSmsTemplates(user.language);
 *   await sendSMS(phone, t.missedDose('Priya', 'Metformin'));
 */

export interface SmsTemplates {
  /** Sent to patient when a dose is missed (T+15 SMS). */
  missedDose: (patientName: string, medName: string, dosage: string, scheduledTime: string) => string;
  /** Sent to caregiver when a patient has missed a dose (T+60). */
  caregiverMissedDose: (patientName: string, medName: string, dosage: string, scheduledTime: string) => string;
  /** Sent to emergency contact when patient is unresponsive (T+120). */
  emergencyContact: (contactName: string, patientName: string, medName: string, dosage: string, scheduledTime: string) => string;
  /** SOS alert sent to each emergency contact. */
  sosAlert: (patientName: string, customMessage: string, locationUrl?: string) => string;
  /** Sent when user taps "Send Test SMS" in Settings. */
  testAlert: () => string;
  /** Sent when a caregiver invite is created with a phone number. */
  caregiverInvite: (patientName: string, acceptUrl: string) => string;
  /** Sent to patient/caregiver when a medication is running low. */
  refillAlert: (medName: string, dosage: string, daysRemaining: number) => string;
  /** Sent to caregiver when a patient's medication is running low. */
  caregiverRefillAlert: (patientName: string, medName: string, dosage: string, daysRemaining: number) => string;
}

const templates: Record<string, SmsTemplates> = {
  en: {
    missedDose: (patientName, medName, dosage, scheduledTime) =>
      `MediSaathi Reminder: Hello ${patientName}, you missed your ${medName} (${dosage}) scheduled at ${scheduledTime}. Please take it now if it's safe to do so.`,

    caregiverMissedDose: (patientName, medName, dosage, scheduledTime) =>
      `MediSaathi Caregiver Alert: ${patientName} missed their ${medName} (${dosage}) scheduled at ${scheduledTime} and has not responded to reminders. Please check on them.`,

    emergencyContact: (contactName, patientName, medName, dosage, scheduledTime) =>
      `MediSaathi EMERGENCY: ${contactName}, ${patientName} missed their ${medName} (${dosage}) at ${scheduledTime} and has not responded to any reminders for 2 hours. Please check on them immediately.`,

    sosAlert: (patientName, customMessage, locationUrl) => {
      let msg = `${customMessage} — sent on behalf of ${patientName} via MediSaathi.`;
      if (locationUrl) msg += ` Location: ${locationUrl}`;
      return msg;
    },

    testAlert: () =>
      `✅ This is a test alert from MediSaathi. Your SMS notifications are working correctly.`,

    caregiverInvite: (patientName, acceptUrl) =>
      `${patientName} invited you to monitor their medications on MediSaathi. Accept here: ${acceptUrl}`,

    refillAlert: (medName, dosage, daysRemaining) =>
      `MediSaathi Alert: Your ${medName} (${dosage}) is running low — only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of stock remaining. Please order a refill soon.`,

    caregiverRefillAlert: (patientName, medName, dosage, daysRemaining) =>
      `MediSaathi Caregiver Alert: ${patientName}'s ${medName} (${dosage}) has ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of stock remaining. Please help them order a refill.`,
  },

  hi: {
    missedDose: (patientName, medName, dosage, scheduledTime) =>
      `मेडिसाथी रिमाइंडर: नमस्कार ${patientName}, आप ${scheduledTime} पर निर्धारित ${medName} (${dosage}) लेना भूल गए। यदि सुरक्षित हो तो अभी लें।`,

    caregiverMissedDose: (patientName, medName, dosage, scheduledTime) =>
      `मेडिसाथी केयरगिवर अलर्ट: ${patientName} ${scheduledTime} पर निर्धारित ${medName} (${dosage}) लेना भूल गए हैं और उन्होंने रिमाइंडर का जवाब नहीं दिया। कृपया उनकी जाँच करें।`,

    emergencyContact: (contactName, patientName, medName, dosage, scheduledTime) =>
      `मेडिसाथी आपातकाल: ${contactName}, ${patientName} ${scheduledTime} पर ${medName} (${dosage}) लेना भूल गए और 2 घंटे से किसी रिमाइंडर का जवाब नहीं दिया। कृपया तुरंत उनकी जाँच करें।`,

    sosAlert: (patientName, customMessage, locationUrl) => {
      let msg = `${customMessage} — ${patientName} द्वारा MediSaathi के माध्यम से भेजा गया।`;
      if (locationUrl) msg += ` स्थान: ${locationUrl}`;
      return msg;
    },

    testAlert: () =>
      `✅ यह MediSaathi से एक परीक्षण संदेश है। आपकी SMS सूचनाएं सक्रिय हैं।`,

    caregiverInvite: (patientName, acceptUrl) =>
      `${patientName} ने आपको MediSaathi पर अपनी दवाओं की निगरानी के लिए आमंत्रित किया है। यहाँ स्वीकार करें: ${acceptUrl}`,

    refillAlert: (medName, dosage, daysRemaining) =>
      `मेडिसाथी अलर्ट: आपकी ${medName} (${dosage}) कम हो रही है — केवल ${daysRemaining} दिन का स्टॉक बचा है। कृपया जल्दी रिफिल करें।`,

    caregiverRefillAlert: (patientName, medName, dosage, daysRemaining) =>
      `मेडिसाथी केयरगिवर अलर्ट: ${patientName} की ${medName} (${dosage}) में ${daysRemaining} दिन का स्टॉक बचा है। कृपया उन्हें रिफिल करने में मदद करें।`,
  },

  mr: {
    missedDose: (patientName, medName, dosage, scheduledTime) =>
      `मेडीसाथी रिमाइंडर: नमस्कार ${patientName}, तुम्ही ${scheduledTime} वाजताची ${medName} (${dosage}) घ्यायला विसरलात. आता सुरक्षित असल्यास घ्या.`,

    caregiverMissedDose: (patientName, medName, dosage, scheduledTime) =>
      `मेडीसाथी केअरगिव्हर अलर्ट: ${patientName} यांनी ${scheduledTime} वाजताची ${medName} (${dosage}) घेतली नाही. कृपया त्यांची तपासणी करा.`,

    emergencyContact: (contactName, patientName, medName, dosage, scheduledTime) =>
      `मेडीसाथी आपत्कालीन: ${contactName}, ${patientName} यांनी ${scheduledTime} वाजताची ${medName} (${dosage}) घेतली नाही आणि 2 तास कोणत्याही रिमाइंडरला प्रतिसाद दिला नाही. कृपया त्वरित तपासणी करा.`,

    sosAlert: (patientName, customMessage, locationUrl) => {
      let msg = `${customMessage} — ${patientName} यांनी MediSaathi द्वारे पाठवले.`;
      if (locationUrl) msg += ` स्थान: ${locationUrl}`;
      return msg;
    },

    testAlert: () =>
      `✅ हा MediSaathi कडून एक चाचणी संदेश आहे. तुमच्या SMS सूचना सक्रिय आहेत.`,

    caregiverInvite: (patientName, acceptUrl) =>
      `${patientName} यांनी तुम्हाला MediSaathi वर त्यांच्या औषधांच्या देखरेखीसाठी आमंत्रित केले आहे. येथे स्वीकार करा: ${acceptUrl}`,

    refillAlert: (medName, dosage, daysRemaining) =>
      `मेडीसाथी अलर्ट: तुमची ${medName} (${dosage}) कमी होत आहे — फक्त ${daysRemaining} दिवसांचा साठा उरला आहे. कृपया लवकर रिफिल करा.`,

    caregiverRefillAlert: (patientName, medName, dosage, daysRemaining) =>
      `मेडीसाथी केअरगिव्हर अलर्ट: ${patientName} यांच्या ${medName} (${dosage}) मध्ये ${daysRemaining} दिवसांचा साठा आहे. कृपया रिफिल करण्यास मदत करा.`,
  },
};

/** Returns the SMS template set for the given language code, falling back to English. */
export function getSmsTemplates(language?: string): SmsTemplates {
  return templates[language as string] ?? templates['en'];
}
