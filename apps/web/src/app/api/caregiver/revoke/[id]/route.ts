import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const caregiverId = params.id;
    if (!caregiverId) {
      return NextResponse.json({ error: 'Caregiver ID is required' }, { status: 400 });
    }

    await User.findByIdAndUpdate(
      userPayload.id,
      { $set: { 'caregiverLinks.$[elem].isActive': false } },
      { arrayFilters: [{ 'elem.userId': caregiverId }] }
    );

    // TODO: Notify caregiver via Socket.io
    // io.to(caregiverId).emit('caregiver-revoked', { patientId: userPayload.id });

    return NextResponse.json({ message: 'Caregiver access revoked' });
  } catch (error: any) {
    console.error('[caregiver/revoke DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
