import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { sendSMS, makePhoneCall } from '@/lib/notificationHelper';
import { getSmsTemplates } from '@/lib/smsTemplates';

export async function POST(req: NextRequest) {
  try {
    const userAuth = requireAuth(req);
    await connectDB();

    const { latitude, longitude } = await req.json().catch(() => ({ latitude: null, longitude: null }));

    const patient = await User.findById(userAuth.id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const contacts = patient.emergencyContacts || [];
    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No emergency contacts found. Add SOS contacts in Settings.' }, { status: 400 });
    }

    const t = getSmsTemplates(patient.language);

    const locationUrl =
      latitude && longitude
        ? `https://maps.google.com/?q=${latitude},${longitude}`
        : undefined;

    const smsBody = t.sosAlert(patient.name, patient.sosMessage || 'EMERGENCY: I need help!', locationUrl);

    const twimlVoice = `<Response><Say voice="alice">Emergency Alert. ${patient.name} has pressed the SOS button. Please check on them immediately.</Say></Response>`;

    // Fire SMS + voice call to each contact in parallel; collect results
    const results = await Promise.allSettled(
      contacts
        .filter((c: any) => !!c.phone)
        .flatMap((contact: any) => [
          sendSMS(contact.phone, smsBody),
          makePhoneCall(contact.phone, `Emergency Alert. ${patient.name} has pressed the SOS button. Please check on them immediately.`),
        ])
    );

    // Count successes vs failures for the response summary
    const summary = results.reduce(
      (acc, r) => {
        if (r.status === 'fulfilled' && r.value.success) acc.sent++;
        else acc.failed++;
        return acc;
      },
      { sent: 0, failed: 0 }
    );

    // Log the full twiml used separately (for debugging)
    console.log('[SOS] TwiML voice message:', twimlVoice);

    return NextResponse.json({
      success: true,
      contactsNotified: contacts.filter((c: any) => c.phone).length,
      sent: summary.sent,
      failed: summary.failed,
    });
  } catch (error: any) {
    console.error('[SOS API] Error:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
