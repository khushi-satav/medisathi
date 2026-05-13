import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req: NextRequest) {
  try {
    // Only internal cron or admin should call this, but for demo we allow authenticated
    requireAuth(req);
    await connectDB();

    const { patientId, message } = await req.json();

    if (!patientId || !message) {
      return NextResponse.json({ error: 'patientId and message required' }, { status: 400 });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Try to find primary emergency contact, fallback to first one, then to patient's own phone
    const primaryContact = patient.emergencyContacts?.find((c: any) => c.isPrimary) || patient.emergencyContacts?.[0];
    const targetPhone = primaryContact?.phone || patient.phone;

    if (!targetPhone) {
      return NextResponse.json({ error: 'No contact phone number found for escalation' }, { status: 404 });
    }

    let call;
    try {
      // Use emergency contact name in the message if possible
      const escalationMessage = primaryContact 
        ? `Alert for emergency contact ${primaryContact.name}: ${message}`
        : message;

      call = await twilioClient.calls.create({
        twiml: `<Response><Say voice="alice">${escalationMessage}</Say></Response>`,
        to: targetPhone,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
      });
    } catch (err: any) {
      console.error('Twilio call failed:', err);
      return NextResponse.json({ error: 'Failed to initiate automated call' }, { status: 502 });
    }

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error: any) {
    console.error('Escalation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
