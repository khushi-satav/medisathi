import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';
import { logDoseToML } from '@/lib/mlClient';
import { createEscalation, resolveEscalation } from '@/services/escalationService';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { medicationId, status, scheduledTime, skipReason, snoozedUntil } = await req.json();

    if (!medicationId || !status || !scheduledTime) {
      return NextResponse.json({ error: 'medicationId, status, and scheduledTime are required' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledTime).toISOString().split('T')[0];

    const log = await DoseLog.findOneAndUpdate(
      { medicationId, scheduledDate, scheduledTime: new Date(scheduledTime) },
      {
        userId: user.id,
        medicationId,
        scheduledDate,
        scheduledTime: new Date(scheduledTime),
        status,
        takenAt: status === 'taken' ? new Date() : undefined,
        skipReason: skipReason || undefined,
        snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : undefined,
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Decrement stock if taken
    if (status === 'taken') {
      await Medication.findByIdAndUpdate(medicationId, { $inc: { stockCount: -1 } });
    }

    // Recalculate adherence stats for the day
    const dayLogs = await DoseLog.find({ userId: user.id, scheduledDate });
    const totalDoses = dayLogs.length;
    const takenDoses = dayLogs.filter(l => l.status === 'taken').length;
    const missedDoses = dayLogs.filter(l => l.status === 'missed').length;
    const skippedDoses = dayLogs.filter(l => l.status === 'skipped').length;
    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    const stats = await AdherenceStats.findOneAndUpdate(
      { userId: user.id, date: scheduledDate },
      { totalDoses, takenDoses, missedDoses, skippedDoses, adherenceRate },
      { upsert: true, returnDocument: 'after' }
    );

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

    // --- MODIFICATION: Escalation on Missed Dose ---
    if (status === 'missed' || status === 'overdue') {
      try {
        await createEscalation(user.id, medicationId, log._id, new Date(scheduledTime));
        console.log('🚨 Escalation workflow started');
      } catch (escErr) {
        console.error('⚠️ Escalation trigger failed:', escErr);
      }
    } else if (status === 'taken' || status === 'skipped' || status === 'snoozed') {
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
