import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import CaregiverInvite from '@/models/CaregiverInvite';

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const patient = await User.findById(userPayload.id).populate('caregiverLinks.userId', 'name email profilePhoto updatedAt');
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const pendingInvites = await CaregiverInvite.find({
      patientId: userPayload.id,
      status: 'pending'
    });

    const caregivers = patient.caregiverLinks
      .filter((link: any) => link.isActive)
      .map((link: any) => ({
        ...link.toObject(),
        caregiver: link.userId,
        lastViewed: link.userId?.updatedAt
      }));

    return NextResponse.json({ caregivers, pendingInvites });
  } catch (error: any) {
    console.error('[caregiver/my-caregivers GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
