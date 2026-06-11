import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const userAuth = await requireAuth(req);
    await connectDB();

    const { latitude, longitude } = await req.json().catch(() => ({ latitude: null, longitude: null }));

    const patient = await User.findById(userAuth.id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const contacts = patient.emergencyContacts || [];
    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No emergency contacts found.' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      console.warn("Twilio credentials missing. Returning success for dev environment.");
      return NextResponse.json({ success: true, message: "SOS Simulated" });
    }

    const twilioClient = twilio(accountSid, authToken);

    const timeString = new Date().toLocaleTimeString(patient.language || 'en-US', { timeZone: patient.timezone, hour: 'numeric', minute: '2-digit' });
    let smsBody = `${patient.sosMessage || 'EMERGENCY: I need help!'} - ${patient.name} pressed SOS at ${timeString}.`;

    if (latitude && longitude) {
      smsBody += ` Location: https://maps.google.com/?q=${latitude},${longitude}`;
    }

    const voiceMessage = `<Response><Say voice="alice">Emergency Alert. ${patient.name} has pressed the SOS button. Please check on them immediately.</Say></Response>`;

    // Execute SMS and Calls simultaneously for all emergency contacts
    const promises = [];

    for (const contact of contacts) {
      if (contact.phone) {
        promises.push(
          twilioClient.messages.create({
            body: smsBody,
            to: contact.phone,
            from: twilioPhone
          }).catch(e => console.error(`Failed SMS to ${contact.phone}`, e))
        );

        promises.push(
          twilioClient.calls.create({
            twiml: voiceMessage,
            to: contact.phone,
            from: twilioPhone
          }).catch(e => console.error(`Failed Call to ${contact.phone}`, e))
        );
      }
    }

    await Promise.allSettled(promises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('SOS API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
