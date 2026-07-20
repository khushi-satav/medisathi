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

    // ── Status machine (single source of truth) ─────────────────────────────
    //
    //   upcoming  → scheduled time is in the future
    //   overdue   → past scheduled time, within the 2-hour grace window
    //               → still actionable: "Take Now" is shown
    //   missed    → past the 2-hour grace window with no log
    //               → no longer shown as actionable without explicit "log late"
    //
    // This is the ONLY place statuses are derived from time.  The stats block
    // below and the schedule badge both read from the same `status` field —
    // they are never computed separately.
    //
    // Grace period: 2 hours after scheduled time → overdue becomes missed.
    // Rationale: enough time to take a slightly-late dose without it being
    // counted as a failure, but short enough to trigger caregiver alerts.
    const OVERDUE_GRACE_MS = 2 * 60 * 60 * 1000; // 2 hours

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
          // Past scheduled time today without a log:
          // - within 2-hour grace window  → overdue (Take Now still shown)
          // - beyond 2-hour grace window  → missed (Take Now removed)
          const msPastDue = nowUTC.getTime() - scheduledTime.getTime();
          status = msPastDue <= OVERDUE_GRACE_MS ? 'overdue' : 'missed';
        } else if (!isToday && scheduledTime < nowUTC) {
          // Past date, no log → definitively missed
          status = 'missed';
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
    const skipped = schedule.filter(s => s.status === 'skipped').length;
    // overdue = past scheduled time, still within grace → still actionable
    const overdue = schedule.filter(s => s.status === 'overdue').length;
    // missed = past the grace window, no longer actionable without "log late"
    // These are distinct from overdue and must NOT be combined in the stat card.
    const missed = schedule.filter(s => s.status === 'missed').length;

    // ── Today's adherence percentage ──────────────────────────────────────────
    // Formula: taken / total (all doses scheduled today, regardless of status)
    //
    // Denominator is `total`, not `taken+missed+skipped`, so this matches the
    // fraction shown in the hero caption ("1 / 5 doses taken").  Using a
    // smaller denominator (past-due only) produced a different effective
    // fraction than the text, which is the bug that caused the ring to show
    // 50% next to "1 / 5 doses taken" (20%).
    //
    // Returns 0 when there are no scheduled doses (not 100).
    const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0;

    return NextResponse.json({
      schedule,
      date,
      // overdue and missed are returned as SEPARATE fields.
      // The client must never add them together and call it "missed".
      stats: { taken, missed, overdue, total, adherencePct },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
