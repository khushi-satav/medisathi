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
    if (!patient || !patient.phone) {
      return NextResponse.json({ error: 'Patient or phone not found' }, { status: 404 });
    }

    let call;
    try {
      call = await twilioClient.calls.create({
        twiml: `<Response><Say>${message}</Say></Response>`,
        to: patient.phone,
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
