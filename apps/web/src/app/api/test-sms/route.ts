import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { sendSMS } from '@/lib/notificationHelper';
import { getSmsTemplates } from '@/lib/smsTemplates';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const dbUser = await User.findById(userPayload.id).select('phone name language');
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!dbUser.phone) {
      return NextResponse.json(
        { error: 'No phone number saved on your account. Add one in Settings first.' },
        { status: 400 }
      );
    }

    const t = getSmsTemplates(dbUser.language);
    const result = await sendSMS(dbUser.phone, t.testAlert());

    if (!result.success) {
      // Surface the specific Twilio error so the user knows exactly what's wrong
      // (e.g. trial-account unverified number, DLT block, wrong number format)
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS. Check server logs for details.' },
        { status: 502 }
      );
    }

    const message = result.simulated
      ? 'SMS simulated (Twilio credentials not configured). Set TWILIO_* env variables for real delivery.'
      : `Test SMS sent to ${dbUser.phone}! Check your phone.`;

    return NextResponse.json({ message, sid: result.sid ?? null });
  } catch (error: any) {
    console.error('[test-sms] Error:', error.message);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
