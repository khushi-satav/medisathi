import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import CaregiverInvite from '@/models/CaregiverInvite';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await connectDB();

    const invite = await CaregiverInvite.findOne({ token }).populate('patientId', 'name email');
    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found or invalid' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `This invitation has already been ${invite.status}.` },
        { status: 400 }
      );
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 400 });
    }

    return NextResponse.json({
      email: invite.caregiverEmail,
      relationship: invite.relationship,
      patientName: invite.patientId?.name || 'A patient',
    });
  } catch (error: any) {
    console.error('[caregiver/invite/verify GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
