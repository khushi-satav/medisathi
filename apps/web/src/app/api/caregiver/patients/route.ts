import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';

// IST offset: +5:30 = 330 minutes
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function buildScheduledTimeIST(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcMidnightOfISTDate = Date.UTC(year, month - 1, day) - IST_OFFSET_MS;
  return new Date(utcMidnightOfISTDate + hours * 3600000 + minutes * 60000);
}

function getTodayIST(): string {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  return istNow.toISOString().split('T')[0];
}

async function getPatientStatsForToday(patientId: string) {
  const today = getTodayIST();
  // Get all active medications for patient
  const medications = await Medication.find({ userId: patientId, isActive: true });
  // Get existing logs for today
  const logs = await DoseLog.find({ userId: patientId, scheduledDate: today });

  const logMap = new Map(
    logs.map(log => [`${log.medicationId}-${new Date(log.scheduledTime).toISOString()}`, log])
  );

  const nowUTC = new Date();
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  let total = 0;
  let lastTakenTime: Date | null = null;
  let nextDueTime: Date | null = null;

  for (const med of medications) {
    if (med.startDate) {
      const medStartStr = new Date(med.startDate).toISOString().split('T')[0];
      if (medStartStr > today) continue;
    }
    if (med.endDate) {
      const medEndStr = new Date(med.endDate).toISOString().split('T')[0];
      if (today > medEndStr) continue;
    }

    for (const time of med.times) {
      const scheduledTime = buildScheduledTimeIST(today, time);
      const logKey = `${med._id}-${scheduledTime.toISOString()}`;
      const existingLog = logMap.get(logKey);

      let status: string;
      if (existingLog) {
        status = existingLog.status;
      } else if (scheduledTime < nowUTC) {
        status = 'overdue';
      } else {
        status = 'upcoming';
      }

      total++;
      if (status === 'taken') {
        taken++;
        const takenAt = existingLog?.takenAt ? new Date(existingLog.takenAt) : new Date(existingLog?.createdAt || scheduledTime);
        if (!lastTakenTime || takenAt > lastTakenTime) {
          lastTakenTime = takenAt;
        }
      } else if (status === 'skipped') {
        skipped++;
      } else if (status === 'missed' || status === 'overdue') {
        missed++;
      } else if (status === 'upcoming') {
        if (!nextDueTime || scheduledTime < nextDueTime) {
          nextDueTime = scheduledTime;
        }
      }
    }
  }

  const pastDoses = taken + missed + skipped;
  const adherence = pastDoses > 0 ? Math.round((taken / pastDoses) * 100) : 0;

  // Format lastTaken
  let lastTakenStr = '--';
  if (lastTakenTime) {
    lastTakenStr = lastTakenTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Format nextDue
  let nextDueStr = '--';
  if (nextDueTime) {
    nextDueStr = nextDueTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Calculate streak from AdherenceStats
  const pastStats = await AdherenceStats.find({ userId: patientId, date: { $ne: today } })
    .sort({ date: -1 })
    .limit(30);

  let streak = 0;
  const todayPassed80 = pastDoses > 0 ? (adherence >= 80) : true;
  if (todayPassed80 && adherence >= 80) {
    streak = 1;
  }
  for (const stat of pastStats) {
    if (stat.adherenceRate >= 80) {
      streak++;
    } else {
      break;
    }
  }

  // Live status
  let liveStatus = 'upcoming';
  if (missed > 0) {
    liveStatus = 'overdue';
  } else if (taken > 0) {
    liveStatus = 'taken';
  }

  const alerts = missed;

  // Get weekly average
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoString = weekAgo.toISOString().split('T')[0];

  const weekStats = await AdherenceStats.find({
    userId: patientId,
    date: { $gte: weekAgoString }
  });

  const weekAvg = weekStats.length
    ? Math.round(weekStats.reduce((s, d) => s + d.adherenceRate, 0) / weekStats.length)
    : 0;

  const finalWeekAvg = weekStats.length ? weekAvg : adherence;

  return {
    adherence,
    todayAdherence: adherence,
    weeklyAvg: finalWeekAvg,
    missedToday: missed,
    alerts,
    streak,
    liveStatus,
    lastTaken: lastTakenStr,
    nextDue: nextDueStr,
    riskLevel: finalWeekAvg >= 80 ? 'low' : finalWeekAvg >= 50 ? 'medium' : 'high'
  };
}

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const caregiver = await User.findById(userPayload.id).populate('caregiverLinks.userId');
    
    if (!caregiver || caregiver.role !== 'caregiver') {
      return NextResponse.json({ error: 'Access denied. Must be a caregiver.' }, { status: 403 });
    }

    // Extract the populated patients from the caregiverLinks array
    const patients = caregiver.caregiverLinks
      .filter((link: any) => link.isActive && link.userId)
      .map((link: any) => link.userId);

    const enrichedPatients = await Promise.all(patients.map(async (p: any) => {
      const stats = await getPatientStatsForToday(p._id.toString());
      return {
        ...p.toObject(),
        ...stats
      };
    }));

    return NextResponse.json({ patients: enrichedPatients });
  } catch (error: any) {
    console.error('Caregiver patients error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
