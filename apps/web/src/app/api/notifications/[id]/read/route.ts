/**
 * PATCH /api/notifications/[id]/read
 * Marks a single notification as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Notification from '@/models/Notification';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const updated = await Notification.findOneAndUpdate(
      { _id: params.id, userId: userPayload.id },
      { $set: { isRead: true, readAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Marked as read', notification: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[notifications/:id/read PATCH]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
