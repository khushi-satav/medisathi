import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import CaregiverInvite from '@/models/CaregiverInvite';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invite = await CaregiverInvite.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('patientId', 'name email conditions');

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    return NextResponse.json(invite);
  } catch (error: any) {
    console.error('[caregiver/invite-details GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
