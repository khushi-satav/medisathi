import AdherenceStats from '@/models/AdherenceStats';
import Medication from '@/models/Medication';

export interface AdherenceWindow {
  stats: any[];
  allMeds: any[];
  startStr: string;
  endStr: string;
  dailyScheduled: Record<string, number>;
  medScheduledMap: Record<string, number>;
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalMissed: number;
  overallRate: number;
}

/**
 * Reconstructs scheduled/taken/missed dose counts for a rolling N-day window
 * directly from the Medication schedule, instead of trusting AdherenceStats
 * row totals in isolation.
 *
 * AdherenceStats rows are only written by recalculateStats(), which only
 * runs when a dose is manually logged (see dose-logs/route.ts). The
 * automatic reconciliation job that would create 'missed' DoseLogs and
 * recalculate stats for days with no user action (checkAndEscalateMissedDoses
 * in escalationService.ts) is not wired to any cron/route anywhere in the
 * app — it is dead code. So a day where the user logged nothing has NO
 * AdherenceStats row at all, and summing AdherenceStats.totalDoses over a
 * window silently drops that day's scheduled (and therefore missed) doses
 * instead of counting them against adherence. That undercounting is what
 * let a 20%-adherence week compute as a high (LOW-risk) percentage.
 *
 * This function is the single source of truth for both the Weekly Adherence
 * card (insights/route.ts) and the AI Risk Analysis card (ai/predict/route.ts)
 * so the two can never diverge again.
 */
export async function getAdherenceWindow(userId: string, days: number): Promise<AdherenceWindow> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const stats = await AdherenceStats.find({
    userId,
    date: { $gte: startStr, $lte: endStr },
  }).sort({ date: 1 });

  const allMeds = await Medication.find({ userId });
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
      // A lapsed course (e.g. a "10 days" antibiotic prescription) must stop
      // being counted as scheduled once its endDate has passed, even though
      // isActive is often left true — nothing in this app auto-deactivates
      // a medication when its course ends. Without this check, an expired
      // prescription accrues "missed" doses forever, artificially dragging
      // adherence down indefinitely.
      const medEndStr = med.endDate ? new Date(med.endDate).toISOString().split('T')[0] : null;
      const medIdStr = med._id.toString();
      if (!medScheduledMap[medIdStr]) medScheduledMap[medIdStr] = 0;

      if (medStartStr <= dStr && (!medEndStr || dStr <= medEndStr) && med.isActive) {
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

  // Reconcile: logged activity (taken+missed+skipped) can exceed the
  // schedule reconstruction in edge cases (e.g. a med deactivated after
  // being logged against) — never let the denominator be smaller than what
  // was actually logged.
  const reconciledTotalScheduled = Math.max(totalScheduled, totalTaken + totalMissed + totalSkipped);

  const overallRate = reconciledTotalScheduled > 0
    ? Math.round((totalTaken / reconciledTotalScheduled) * 100)
    : 0;

  return {
    stats,
    allMeds,
    startStr,
    endStr,
    dailyScheduled,
    medScheduledMap,
    totalScheduled: reconciledTotalScheduled,
    totalTaken,
    totalSkipped,
    totalMissed,
    overallRate,
  };
}
