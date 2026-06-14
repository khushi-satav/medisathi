import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';

// IST offset: +5:30 = 330 minutes
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Build a Date for a given "YYYY-MM-DD" date string + "HH:mm" time string in IST */
function buildScheduledTimeIST(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Construct as UTC midnight of IST date, then add IST hours
  const utcMidnightOfISTDate = Date.UTC(year, month - 1, day) - IST_OFFSET_MS;
  return new Date(utcMidnightOfISTDate + hours * 3600000 + minutes * 60000);
}

/** Get today's date string in IST "YYYY-MM-DD" */
function getTodayIST(): string {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  return istNow.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getTodayIST();

    // Get all active medications
    const medications = await Medication.find({ userId: user.id, isActive: true });

    // Get existing logs for that date
    const logs = await DoseLog.find({ userId: user.id, scheduledDate: date });

    // Build logMap keyed by "medicationId-scheduledTime.toISOString()"
    const logMap = new Map(
      logs.map(log => [`${log.medicationId}-${new Date(log.scheduledTime).toISOString()}`, log])
    );

    const nowUTC = new Date();
    // Current time in IST for overdue comparison
    const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
    const todayIST = getTodayIST();
    const isToday = date === todayIST;

    const schedule = [];

    for (const med of medications) {
      for (const time of med.times) {
        const scheduledTime = buildScheduledTimeIST(date, time);
        const logKey = `${med._id}-${scheduledTime.toISOString()}`;
        const existingLog = logMap.get(logKey);

        let status: string;
        if (existingLog) {
          // Use persisted status (taken, missed, skipped, snoozed, overdue)
          status = existingLog.status;
        } else if (isToday && scheduledTime < nowUTC) {
          // Past scheduled time today without a log → overdue
          status = 'overdue';
        } else {
          status = 'upcoming';
        }

        schedule.push({
          medicationId: med._id,
          name: med.name,
          medicationName: med.name,
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

    // Sort by scheduled time
    schedule.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    // ── Stats Calculation ──────────────────────────────────────────────────────
    const total = schedule.length;
    const taken = schedule.filter(s => s.status === 'taken').length;
    // Only count missed + overdue (past-due doses), NOT upcoming ones, as "missed"
    const missed = schedule.filter(s => s.status === 'missed' || s.status === 'overdue').length;

    // Adherence = taken / (doses that have already passed their scheduled time)
    // For today: past doses = taken + missed + skipped + snoozed (NOT upcoming)
    // For past dates: all doses count
    const pastDoses = schedule.filter(s => !['upcoming'].includes(s.status)).length;
    const adherencePct = pastDoses > 0 ? Math.round((taken / pastDoses) * 100) : 100;

    return NextResponse.json({
      schedule,
      date,
      stats: { taken, missed, total, adherencePct },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
