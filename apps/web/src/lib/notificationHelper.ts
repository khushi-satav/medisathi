/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from 'firebase-admin';
import twilio from 'twilio';
import Notification, { NotificationType } from '@/models/Notification';
import User from '@/models/User';

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
let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.error('Failed to initialize Twilio client:', err);
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

    return notif;
  } catch (error) {
    console.error(`Error sending push notification to user ${userId}:`, error);
    throw error;
  }
}

export async function sendSMS(toPhone: string, body: string) {
  if (!toPhone) {
    console.log('No phone number provided for SMS. Bypassing.');
    return { success: false, reason: 'No phone number' };
  }

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body,
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      });
      console.log(`SMS sent successfully to ${toPhone}. SID: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (err: any) {
      console.error(`Failed to send SMS via Twilio to ${toPhone}:`, err.message);
      // Fallback/Simulate so tests and cron don't fail completely
      console.log(`[SIMULATED SMS FALLBACK] To: ${toPhone}, Body: ${body}`);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[SIMULATED SMS] To: ${toPhone}, Body: ${body}`);
    return { success: true, simulated: true };
  }
}

export async function makePhoneCall(toPhone: string, textMessage: string) {
  if (!toPhone) {
    console.log('No phone number provided for Phone Call. Bypassing.');
    return { success: false, reason: 'No phone number' };
  }

  if (twilioClient) {
    try {
      const call = await twilioClient.calls.create({
        twiml: `<Response><Say voice="alice" loop="2">${textMessage}</Say></Response>`,
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      });
      console.log(`Voice call initiated to ${toPhone}. SID: ${call.sid}`);
      return { success: true, sid: call.sid };
    } catch (err: any) {
      console.error(`Failed to initiate phone call via Twilio to ${toPhone}:`, err.message);
      console.log(`[SIMULATED PHONE CALL FALLBACK] To: ${toPhone}, Message: ${textMessage}`);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[SIMULATED PHONE CALL] To: ${toPhone}, Message: ${textMessage}`);
    return { success: true, simulated: true };
  }
}
