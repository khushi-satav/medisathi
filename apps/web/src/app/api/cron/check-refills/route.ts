import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import User from '@/models/User';
import twilio from 'twilio';

// This endpoint could be triggered daily by Vercel Cron or a similar service
export async function GET(req: NextRequest) {
  try {
    // Optionally add a security token check here so only authorized cron can call
    // if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectDB();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      console.warn("Twilio credentials missing. Skipping SMS notifications.");
    }

    const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

    // Find all active medications
    const medications = await Medication.find({ isActive: true }).populate('userId');

    let alertsSent = 0;

    for (const med of medications) {
      if (!med.userId) continue;

      const user = await User.findById(med.userId);
      if (!user) continue;

      const daysRemaining = med.times.length > 0
        ? Math.floor(med.stockCount / med.times.length)
        : 0;

      const alertThreshold = med.refillAlertDays || 7;

      if (daysRemaining <= alertThreshold) {
        const messageBody = `Alert: ${med.name} ${med.dosage} running low. Only ${daysRemaining} days left in stock. Please order a refill soon!`;

        // Send to patient if they have a phone number
        if (twilioClient && user.phone) {
          try {
            await twilioClient.messages.create({
              body: messageBody,
              to: user.phone,
              from: twilioPhone
            });
            alertsSent++;
          } catch (err) {
            console.error(`Failed to send SMS to patient ${user.phone}:`, err);
          }
        }

        // Send to caregiver/emergency contacts if applicable
        if (twilioClient && user.emergencyContacts && user.emergencyContacts.length > 0) {
          for (const contact of user.emergencyContacts) {
            if (contact.phone) {
              try {
                await twilioClient.messages.create({
                  body: `Caregiver Alert for ${user.name}: ${med.name} ${med.dosage} is running low (${daysRemaining} days left).`,
                  to: contact.phone,
                  from: twilioPhone
                });
                alertsSent++;
              } catch (err) {
                console.error(`Failed to send SMS to caregiver ${contact.phone}:`, err);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, alertsSent });
  } catch (error: any) {
    console.error('Refill cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
