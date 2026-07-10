import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';
import { logDoseToML } from '@/lib/mlClient';
import { createEscalation, resolveEscalation, recalculateStats } from '@/services/escalationService';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { medicationId, status, scheduledTime, skipReason, snoozedUntil } = await req.json();

    if (!medicationId || !status || !scheduledTime) {
      return NextResponse.json({ error: 'medicationId, status, and scheduledTime are required' }, { status: 400 });
    }

    // Use IST date for scheduledDate so early-morning doses (1:30 AM IST = prev-day UTC) are stored correctly
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const scheduledDate = new Date(new Date(scheduledTime).getTime() + IST_OFFSET_MS)
      .toISOString()
      .split('T')[0];

    // Find the existing log first (to check previous status)
    const existingLog = await DoseLog.findOne({
      medicationId,
      scheduledDate,
      scheduledTime: new Date(scheduledTime),
    });
    const prevStatus = existingLog?.status;

    const log = await DoseLog.findOneAndUpdate(
      { medicationId, scheduledDate, scheduledTime: new Date(scheduledTime) },
      {
        $set: {
          userId: user.id,
          medicationId,
          scheduledDate,
          scheduledTime: new Date(scheduledTime),
          status,
          takenAt: status === 'taken' ? new Date() : undefined,
          skipReason: skipReason || undefined,
          snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : undefined,
        },
      },
      { upsert: true, returnDocument: 'after', new: true }
    );

    // Decrement stock ONLY if transitioning TO taken (guard against double-log)
    if (status === 'taken' && prevStatus !== 'taken') {
      await Medication.findByIdAndUpdate(medicationId, { $inc: { stockCount: -1 } });
    }

    // Recalculate adherence stats for the day
    await recalculateStats(user.id, scheduledDate);
    const stats = await AdherenceStats.findOne({ userId: user.id, date: scheduledDate });

    // Fire-and-forget: send dose data to ML API for retraining
    const scheduledDt = new Date(scheduledTime);
    logDoseToML({
      userId: user.id,
      medicationId,
      status,
      scheduledTime,
      hour: scheduledDt.getHours(),
      dayOfWeek: scheduledDt.getDay(),
    });

    // --- Escalation logic ---
    // Only start escalation if this is a new miss (wasn't already escalated)
    if (status === 'missed') {
      try {
        await createEscalation(user.id, medicationId, log._id, new Date(scheduledTime));
        console.log('🚨 Escalation workflow started for missed dose');
      } catch (escErr) {
        console.error('⚠️ Escalation trigger failed:', escErr);
      }
    } else if (['taken', 'skipped', 'snoozed'].includes(status)) {
      // Resolve any active escalation when user acknowledges the dose
      try {
        await resolveEscalation(log._id);
        console.log('✅ Escalation resolved/cancelled');
      } catch (escErr) {
        console.error('⚠️ Escalation resolution failed:', escErr);
      }
    }

    return NextResponse.json({ log, stats });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const medicationId = searchParams.get('medicationId');

    const query: any = { userId: user.id };
    if (startDate && endDate) {
      query.scheduledDate = { $gte: startDate, $lte: endDate };
    }
    if (medicationId) query.medicationId = medicationId;

    const logs = await DoseLog.find(query)
      .populate('medicationId', 'name color dosage')
      .sort({ scheduledTime: -1 })
      .limit(200);

    return NextResponse.json({ logs });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
