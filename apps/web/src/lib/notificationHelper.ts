/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from 'firebase-admin';
import twilio from 'twilio';
import Notification, { NotificationType } from '@/models/Notification';
import User from '@/models/User';
import SimulationLog from '@/models/SimulationLog';

// Initialize Firebase Admin SDK if credentials are provided
let isFirebaseInitialized = false;
try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isFirebaseInitialized = true;
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.log('Firebase Admin credentials missing. Push notifications will be simulated in the console/socket.');
    }
  } else {
    isFirebaseInitialized = true;
  }
} catch (err) {
  console.error('Error initializing Firebase Admin:', err);
}

// Initialize Twilio Client
// All three vars must be present for real SMS/call delivery.
// If any are missing, sendSMS/makePhoneCall will simulate and log clearly.
let twilioClient: any = null;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const missingTwilioVars: string[] = [];
if (!TWILIO_ACCOUNT_SID) missingTwilioVars.push('TWILIO_ACCOUNT_SID');
if (!TWILIO_AUTH_TOKEN)  missingTwilioVars.push('TWILIO_AUTH_TOKEN');
if (!TWILIO_PHONE_NUMBER) missingTwilioVars.push('TWILIO_PHONE_NUMBER');

if (missingTwilioVars.length > 0) {
  console.warn(
    `[MediSaathi] ⚠️  Twilio not configured — missing: ${missingTwilioVars.join(', ')}. ` +
    `SMS and voice calls will be SIMULATED. Add these to .env.local to enable real delivery.`
  );
} else {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
    console.log(`[MediSaathi] ✅ Twilio initialized. Sending from ${TWILIO_PHONE_NUMBER}`);
  } catch (err) {
    console.error('[MediSaathi] Failed to initialize Twilio client:', err);
  }
}


export async function sendPushNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, any>
) {
  try {
    // 1. Create a notification entry in the database
    const notif = await Notification.create({
      userId,
      type,
      title,
      body,
      metadata,
    });

    // 2. Broadcast via Socket.io
    const io = (global as any).io;
    if (io) {
      console.log(`Broadcasting socket notification to user: ${userId}`);
      io.emit('new_notification', {
        id: notif._id,
        userId,
        type,
        title,
        body,
        metadata,
        createdAt: notif.createdAt,
      });
    }

    // 3. Send Push via Firebase if token is present
    const user = await User.findById(userId);
    if (user && user.fcmToken) {
      if (isFirebaseInitialized) {
        try {
          await admin.messaging().send({
            token: user.fcmToken,
            notification: { title, body },
            data: metadata ? Object.fromEntries(
              Object.entries(metadata).map(([k, v]) => [k, String(v)])
            ) : {},
          });
          console.log(`FCM push notification sent to user ${userId} (${user.name})`);
        } catch (fcmErr) {
          console.error(`Failed to send real FCM push notification to ${userId}:`, fcmErr);
        }
      } else {
        console.log(`[SIMULATED PUSH NOTIFICATION] Token: ${user.fcmToken}, Title: ${title}, Body: ${body}`);
      }
    } else {
      console.log(`User ${userId} does not have an FCM token. FCM push bypassed.`);
    }

    // Log simulation
    try {
      await SimulationLog.create({
        type: 'push',
        recipientName: user?.name || 'Unknown Patient',
        recipientRole: user?.role || 'patient',
        recipientPhone: user?.phone,
        message: `${title}: ${body}`,
        status: (user?.fcmToken && isFirebaseInitialized) ? 'success' : 'simulated',
        timestamp: new Date(),
        metadata: { ...metadata, fcmToken: user?.fcmToken }
      });
    } catch (simErr) {
      console.error('Failed to log push simulation:', simErr);
    }

    return notif;
  } catch (error) {
    console.error(`Error sending push notification to user ${userId}:`, error);
    throw error;
  }
}

export async function sendSMS(toPhone: string, body: string): Promise<{ success: boolean; sid?: string; simulated?: boolean; error?: string }> {
  if (!toPhone) {
    console.log('sendSMS: No phone number provided. Skipping.');
    return { success: false, error: 'No phone number provided' };
  }
  if (!body) {
    return { success: false, error: 'No message body provided' };
  }

  // ── E.164 phone validation ───────────────────────────────────────────────
  const { isValidPhoneNumber } = await import('libphonenumber-js');
  if (!isValidPhoneNumber(toPhone)) {
    console.warn(`sendSMS: Invalid phone number format: "${toPhone}". Must be E.164 (e.g. +919876543210).`);
    return { success: false, error: `Invalid phone number format: "${toPhone}". Use E.164 format, e.g. +919876543210.` };
  }

  let logStatus: 'success' | 'simulated' | 'failed' = 'simulated';
  let twilioSid = '';
  let errMessage = '';

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body,
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER || '',
      });
      console.log(`SMS sent successfully to ${toPhone}. SID: ${message.sid}`);
      logStatus = 'success';
      twilioSid = message.sid;
    } catch (err: any) {
      // Surface Twilio error codes for debugging (trial, DLT block, unverified number, etc.)
      console.error(`Twilio SMS failed to ${toPhone}: [${err.code}] ${err.message}`);
      logStatus = 'failed';
      errMessage = `[Twilio ${err.code ?? 'error'}] ${err.message}`;
    }
  } else {
    // Credentials not configured — log clearly but do NOT return success=true
    console.warn(`[SIMULATED SMS — no Twilio credentials] To: ${toPhone}, Body: ${body}`);
    logStatus = 'simulated';
  }

  // ── Persist to MongoDB for audit trail ──────────────────────────────────
  try {
    const user = await User.findOne({ phone: toPhone });
    await SimulationLog.create({
      type: 'sms',
      recipientName: user?.name || 'Unknown',
      recipientPhone: toPhone,
      recipientRole: user?.role || 'patient',
      message: body,
      status: logStatus,
      timestamp: new Date(),
      metadata: twilioSid ? { twilioSid } : (errMessage ? { error: errMessage } : undefined),
    });
  } catch (simErr) {
    console.error('Failed to write SMS audit log:', simErr);
  }

  if (logStatus === 'success') return { success: true, sid: twilioSid };
  if (logStatus === 'simulated') return { success: true, simulated: true };
  return { success: false, error: errMessage };
}

export async function makePhoneCall(toPhone: string, textMessage: string): Promise<{ success: boolean; sid?: string; simulated?: boolean; error?: string }> {
  if (!toPhone) {
    console.log('makePhoneCall: No phone number provided. Skipping.');
    return { success: false, error: 'No phone number provided' };
  }

  // ── E.164 phone validation ───────────────────────────────────────────────
  const { isValidPhoneNumber } = await import('libphonenumber-js');
  if (!isValidPhoneNumber(toPhone)) {
    console.warn(`makePhoneCall: Invalid phone number format: "${toPhone}".`);
    return { success: false, error: `Invalid phone number format: "${toPhone}". Use E.164 format, e.g. +919876543210.` };
  }

  let logStatus: 'success' | 'simulated' | 'failed' = 'simulated';
  let twilioSid = '';
  let errMessage = '';

  if (twilioClient) {
    try {
      const call = await twilioClient.calls.create({
        twiml: `<Response><Say voice="alice" loop="2">${textMessage}</Say></Response>`,
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER || '',
      });
      console.log(`Voice call initiated to ${toPhone}. SID: ${call.sid}`);
      logStatus = 'success';
      twilioSid = call.sid;
    } catch (err: any) {
      console.error(`Twilio call failed to ${toPhone}: [${err.code}] ${err.message}`);
      logStatus = 'failed';
      errMessage = `[Twilio ${err.code ?? 'error'}] ${err.message}`;
    }
  } else {
    console.warn(`[SIMULATED CALL — no Twilio credentials] To: ${toPhone}, Message: ${textMessage}`);
    logStatus = 'simulated';
  }

  // ── Persist to MongoDB for audit trail ──────────────────────────────────
  try {
    const user = await User.findOne({ phone: toPhone });
    await SimulationLog.create({
      type: 'call',
      recipientName: user?.name || 'Unknown',
      recipientPhone: toPhone,
      recipientRole: user?.role || 'patient',
      message: textMessage,
      status: logStatus,
      timestamp: new Date(),
      metadata: twilioSid ? { twilioSid } : (errMessage ? { error: errMessage } : undefined),
    });
  } catch (simErr) {
    console.error('Failed to write call audit log:', simErr);
  }

  if (logStatus === 'success') return { success: true, sid: twilioSid };
  if (logStatus === 'simulated') return { success: true, simulated: true };
  return { success: false, error: errMessage };
}

