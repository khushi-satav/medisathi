import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import CaregiverInvite from '@/models/CaregiverInvite';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invite = await CaregiverInvite.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    const caregiverUser = await User.findById(userPayload.id);
    if (!caregiverUser) {
      return NextResponse.json({ error: 'Caregiver not found' }, { status: 404 });
    }

    // Link caregiver to patient
    await User.findByIdAndUpdate(invite.patientId, {
      $addToSet: {
        caregiverLinks: {
          userId: caregiverUser._id,
          email: caregiverUser.email,
          name: caregiverUser.name,
          relationship: invite.relationship,
          permissions: invite.permissions,
          isActive: true,
          linkedAt: new Date()
        }
      }
    });

    // Update invite status
    invite.status = 'accepted';
    invite.caregiverId = caregiverUser._id;
    invite.acceptedAt = new Date();
    await invite.save();

    // TODO: Send Socket.io event & Create Notification
    // io.to(invite.patientId.toString()).emit('caregiver-accepted', { ... })
    // Notification.create({ ... })

    return NextResponse.json({ message: 'Connection established', patientId: invite.patientId });
  } catch (error: any) {
    console.error('[caregiver/confirm-accept POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
