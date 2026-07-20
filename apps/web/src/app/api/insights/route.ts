import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import AdherenceStats from '@/models/AdherenceStats';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';
import { predictAdherenceRisk } from '@/lib/mlClient';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const stats = await AdherenceStats.find({
      userId: user.id,
      date: { $gte: startStr, $lte: endStr },
    }).sort({ date: 1 });

    const allMeds = await Medication.find({ userId: user.id });
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const dailyScheduled: Record<string, number> = {};
    const medScheduledMap: Record<string, number> = {};
    let totalScheduled = 0;
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      
      if (dStr > endStr) continue;
      dailyScheduled[dStr] = 0;

      for (const med of allMeds) {
        if (!med.startDate) continue;
        const medStartStr = new Date(med.startDate).toISOString().split('T')[0];
        const medIdStr = med._id.toString();
        if (!medScheduledMap[medIdStr]) medScheduledMap[medIdStr] = 0;

        if (medStartStr <= dStr && med.isActive) {
          if (dStr === todayStr) {
            for (const t of med.times) {
              const [h, m] = t.split(':').map(Number);
              const schedTime = new Date(dStr);
              schedTime.setHours(h, m, 0, 0);
              if (schedTime <= now) {
                dailyScheduled[dStr]++;
                totalScheduled++;
                medScheduledMap[medIdStr]++;
              }
            }
          } else {
            dailyScheduled[dStr] += med.times.length;
            totalScheduled += med.times.length;
            medScheduledMap[medIdStr] += med.times.length;
          }
        }
      }
    }

    const totalTaken = stats.reduce((s, d) => s + d.takenDoses, 0);
    const totalSkipped = stats.reduce((s, d) => s + d.skippedDoses, 0);
    const explicitMissed = stats.reduce((s, d) => s + d.missedDoses, 0);

    const calculatedMissed = totalScheduled - totalTaken - totalSkipped;
    const totalMissed = Math.max(explicitMissed, calculatedMissed > 0 ? calculatedMissed : 0);

    totalScheduled = Math.max(totalScheduled, totalTaken + totalMissed + totalSkipped);

    const overallRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    // Map stats by date
    const statsByDate: Record<string, any> = {};
    for (const s of stats) statsByDate[s.date] = s;

    let missedDosesLast7d = 0;
    const dailyTrend = [];
    
    // Arrays for tracking streak
    const adherenceByDay = [];

    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      if (dStr > endStr) continue;

      const sched = dailyScheduled[dStr] || 0;
      const s = statsByDate[dStr];
      const taken = s ? s.takenDoses : 0;
      const dayExplicitMissed = s ? s.missedDoses : 0;
      const skipped = s ? s.skippedDoses : 0;
      
      const calcMissed = Math.max(0, sched - taken - skipped);
      const dailyMissed = Math.max(dayExplicitMissed, calcMissed);
      
      const adherencePct = sched > 0 ? Math.round((taken / sched) * 100) : 0;
      dailyTrend.push({
        date: dStr,
        adherencePct,
      });
      
      if (sched > 0) {
        adherenceByDay.push({ date: dStr, adherencePct });
      }

      // Calculate last 7 days missed
      if (i >= days - 7) {
         missedDosesLast7d += dailyMissed;
      }
    }

    // Current streak
    let streak = 0;
    const sortedDesc = [...adherenceByDay].sort((a, b) => b.date.localeCompare(a.date));
    for (const day of sortedDesc) {
      if (day.adherencePct >= 80) streak++;
      else break;
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentTempStreak = 0;
    for (const day of adherenceByDay) {
      if (day.adherencePct >= 80) {
        currentTempStreak++;
        if (currentTempStreak > longestStreak) longestStreak = currentTempStreak;
      } else {
        currentTempStreak = 0;
      }
    }

    // Active medications count
    const activeMeds = await Medication.countDocuments({ userId: user.id, isActive: true });

    // By Medication
    const logs = await DoseLog.find({
      userId: user.id,
      scheduledDate: { $gte: startStr, $lte: endStr },
    }).populate('medicationId', 'name isActive');

    const medStats: Record<string, { name: string; taken: number; total: number }> = {};

    // 1. Prepopulate with active medications' scheduled doses, grouped by name (case-insensitive)
    for (const med of allMeds) {
      if (!med.isActive) continue;
      const name = med.name.trim();
      const key = name.toLowerCase();
      const scheduled = medScheduledMap[med._id.toString()] || 0;

      if (!medStats[key]) {
        medStats[key] = { name, taken: 0, total: 0 };
      }
      medStats[key].total += scheduled;
    }

    // 2. Loop through all dose logs to count actual taken/skipped/missed status
    for (const log of logs) {
      if (!log.medicationId) continue;
      const name = (log.medicationId as any).name.trim();
      const key = name.toLowerCase();

      if (!medStats[key]) {
        medStats[key] = { name, taken: 0, total: 0 };
      }

      if (log.status === 'taken') {
        medStats[key].taken++;
      }

      // If the medication is inactive, we dynamically add it to total since it was not pre-populated.
      if (!(log.medicationId as any).isActive) {
        medStats[key].total++;
      }
    }

    // 3. For each consolidated medicine group, ensure stats make sense:
    //    total should be at least (taken + skipped + missed logs), and we adjust it properly.
    for (const key of Object.keys(medStats)) {
      const stats = medStats[key];
      const keyLogs = logs.filter(l => l.medicationId && (l.medicationId as any).name.trim().toLowerCase() === key);
      const takenLogs = keyLogs.filter(l => l.status === 'taken').length;
      const skippedLogs = keyLogs.filter(l => l.status === 'skipped').length;
      const missedLogs = keyLogs.filter(l => l.status === 'missed').length;

      const loggedTotal = takenLogs + skippedLogs + missedLogs;
      if (loggedTotal > stats.total) {
        stats.total = loggedTotal;
      }
      stats.taken = takenLogs;
    }

    // 4. Return as list sorted by total count desc, filtered to only show meds with scheduled/logged doses
    const byMedication = Object.values(medStats)
      .filter(med => med.total > 0)
      .map(med => ({
        ...med,
        adherencePercentage: med.total > 0 ? Math.round((med.taken / med.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Risk level (deterministic) ─────────────────────────────────────────────
    // Same thresholds as predict/route.ts so the two cards are always consistent.
    // The ML prediction's riskLevel field is discarded — only riskFactors and
    // recommendation are accepted from the model.
    let riskLevel: string;
    if (totalScheduled === 0) {
      riskLevel = 'unknown'; // no scheduled doses in window — insufficient data
    } else if (overallRate >= 80) {
      riskLevel = 'low';
    } else if (overallRate >= 50) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    // Call the real ML API for contextual riskFactors / recommendation only.
    const prediction = await predictAdherenceRisk({
      userId: user.id,
      age: 45, // Demo default
      missed_doses_last_7d: missedDosesLast7d,
      frequency: activeMeds > 0 ? 2 : 1, // Approximation for average frequency
      has_chronic_condition: true,
      adherence_streak: streak,
      hour_of_day: now.getHours(),
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      num_medications: activeMeds,
      days_since_start: 90, // Demo default
      stock_days_remaining: 15, // Demo default
    });

    let aiInsights: string[] = [];

    if (prediction) {
      // Accept riskFactors + recommendation from ML, but NEVER its riskLevel.
      aiInsights = [
        ...prediction.riskFactors,
        // Only include the recommendation when there are real misses.
        ...(missedDosesLast7d > 0 && prediction.recommendation ? [prediction.recommendation] : []),
      ];
    } else {
      // Fallback: ML API down. Emit only actionable insights, no false praise.
      if (riskLevel === 'medium') {
        aiInsights.push('Consider setting an extra alarm for doses that are often missed.');
      }
      if (riskLevel === 'high') {
        aiInsights.push('Your recent missed doses could affect your treatment. Please talk to your caregiver.');
      }
      // riskLevel === 'low' with real data: no message needed, leave aiInsights empty.
    }

    return NextResponse.json({

      adherencePercentage: overallRate,
      totalDoses: totalScheduled,
      takenDoses: totalTaken,
      missedDoses: totalMissed,
      skippedDoses: totalSkipped,
      currentStreak: streak,
      longestStreak: longestStreak,
      dailyTrend,
      byMedication,
      aiInsights,
      riskLevel,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
