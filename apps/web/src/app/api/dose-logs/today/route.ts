import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get all active medications
    const medications = await Medication.find({ userId: user.id, isActive: true });

    // Get existing logs for that date
    const logs = await DoseLog.find({ userId: user.id, scheduledDate: date });

    const logMap = new Map(
      logs.map(log => [`${log.medicationId}-${log.scheduledTime.toISOString()}`, log])
    );

    const now = new Date();
    const schedule = [];

    for (const med of medications) {
      for (const time of med.times) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const logKey = `${med._id}-${scheduledTime.toISOString()}`;
        const existingLog = logMap.get(logKey);

        let status: string;
        if (existingLog) {
          status = existingLog.status;
        } else if (scheduledTime < now && date === new Date().toISOString().split('T')[0]) {
          status = 'overdue';
        } else {
          status = 'upcoming';
        }

        schedule.push({
          medicationId: med._id,
          name: med.name,
          dosage: med.dosage,
          form: med.form,
          time,
          scheduledTime: scheduledTime.toISOString(),
          foodInstruction: med.foodInstruction,
          condition: med.condition,
          color: med.color,
          status,
          logId: existingLog?._id,
          skipReason: existingLog?.skipReason,
          snoozedUntil: existingLog?.snoozedUntil,
        });
      }
    }

    schedule.sort((a, b) => a.time.localeCompare(b.time));

    // Summary stats
    const taken = schedule.filter(s => s.status === 'taken').length;
    const missed = schedule.filter(s => s.status === 'missed' || s.status === 'overdue').length;
    const total = schedule.length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    return NextResponse.json({ schedule, date, stats: { taken, missed, total, adherenceRate } });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
