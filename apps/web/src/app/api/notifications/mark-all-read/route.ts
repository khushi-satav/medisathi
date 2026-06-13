/**
 * PATCH /api/notifications/mark-all-read
 * Marks every unread notification for the current user as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Notification from '@/models/Notification';

export async function PATCH(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const result = await Notification.updateMany(
      { userId: userPayload.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return NextResponse.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[notifications/mark-all-read PATCH]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
