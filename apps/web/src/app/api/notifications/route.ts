/**
 * GET  /api/notifications?limit=20&type=All
 * PATCH /api/notifications/mark-all-read  → see mark-all-read/route.ts
 * PATCH /api/notifications/:id/read       → see [id]/read/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Notification from '@/models/Notification';

// ─── GET /api/notifications ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);
    const type = searchParams.get('type');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { userId: userPayload.id };
    if (type && type !== 'All') {
      // Map tab labels to type patterns
      const typeMap: Record<string, string> = {
        Medication: 'DOSE',
        Caregiver: 'CAREGIVER',
        System: 'SYSTEM',
      };
      const prefix = typeMap[type];
      if (prefix) filter.type = { $regex: `^${prefix}`, $options: 'i' };
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ userId: userPayload.id, isRead: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[notifications GET]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST /api/notifications  (internal: create a notification) ───────────────
export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { type, title, body: notifBody, metadata } = body;

    if (!type || !title || !notifBody) {
      return NextResponse.json({ error: 'type, title, body required' }, { status: 400 });
    }

    const notif = await Notification.create({
      userId: userPayload.id,
      type,
      title,
      body: notifBody,
      metadata,
    });

    return NextResponse.json({ notification: notif }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[notifications POST]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
