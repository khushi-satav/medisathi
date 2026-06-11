import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user.phone) {
      return NextResponse.json({ error: 'User does not have a phone number' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
       console.error("Twilio credentials missing in environment variables.");
       // Don't fail completely if running locally without twilio, just simulate it.
       return NextResponse.json({ message: "Test SMS sent! (Simulated due to missing credentials)" });
    }

    const twilioClient = twilio(accountSid, authToken);

    await twilioClient.messages.create({
      body: "✅ MediSaathi SMS test successful! Your reminders are active.",
      to: user.phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return NextResponse.json({ message: "Test SMS sent!" });
  } catch (error: any) {
    console.error('Test SMS error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
