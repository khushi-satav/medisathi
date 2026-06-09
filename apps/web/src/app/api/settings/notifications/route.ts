/**
 * POST /api/settings/notifications
 * ───────────────────────────────
 * Updates the user's notification settings preferences.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const body = await req.json();

    const allowedSettingsKeys = [
      'insulin_reminders',
      'appointment_reminders',
      'meal_reminders',
      'mood_checkins',
      'school_mode',
      'smart_timing',
      'caregiver_alerts',
      'refill_alerts',
      'missed_dose_escalation',
      'weekly_report',
      'advance_reminder_time',
      'share_logs_doctor',
      'shared_doctor_id',
    ];

    // Build update object
    const updateObj: Record<string, any> = {};
    for (const key of allowedSettingsKeys) {
      if (body[key] !== undefined) {
        updateObj[`settings.${key}`] = body[key];
      }
    }

    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json({ error: 'No valid setting fields provided' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userPayload.id,
      { $set: updateObj },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: updatedUser.settings,
      user: updatedUser,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[settings/notifications POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const userObj = await User.findById(userPayload.id).select('settings');
    if (!userObj) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: userObj.settings || {},
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[settings/notifications GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
