/**
 * DELETE /api/caregiver/invite/[id]
 * ─────────────────────────────────
 * Handles both:
 * 1. Revoking a pending invitation (by invite ID)
 * 2. Disconnecting an active caregiver/patient connection (by target user ID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import CaregiverInvite from '@/models/CaregiverInvite';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();
    const { id } = params;

    // 1. Try to find if id matches a CaregiverInvite
    const invite = await CaregiverInvite.findById(id);
    if (invite) {
      const currentUser = await User.findById(userPayload.id).select('email');
      const isPatient = invite.patientId.toString() === userPayload.id;
      const isCaregiver =
        currentUser &&
        invite.caregiverEmail.toLowerCase() === currentUser.email.toLowerCase();

      if (!isPatient && !isCaregiver) {
        return NextResponse.json(
          { error: 'Unauthorized to modify this invitation' },
          { status: 403 }
        );
      }

      invite.status = 'revoked';
      await invite.save();
      return NextResponse.json({ success: true, message: 'Invitation revoked successfully' });
    }

    // 2. If not an invite, try to treat id as a connected User's ID (to disconnect connection)
    const resCurrentUser = await User.updateOne(
      { _id: userPayload.id },
      { $pull: { caregiverLinks: { userId: id } } }
    );

    const resTargetUser = await User.updateOne(
      { _id: id },
      { $pull: { caregiverLinks: { userId: userPayload.id } } }
    );

    if (resCurrentUser.modifiedCount > 0 || resTargetUser.modifiedCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Connection disconnected successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invitation or active connection not found' },
      { status: 404 }
    );
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[caregiver/invite/[id] DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
