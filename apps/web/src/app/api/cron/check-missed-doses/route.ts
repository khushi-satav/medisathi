export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import CronRunLog from '@/models/CronRunLog';
import { checkAndEscalateMissedDoses, processActiveEscalations } from '@/services/escalationService';

/**
 * GET /api/cron/check-missed-doses
 *
 * This is the job that makes the caregiver-alert feature real. Without it
 * running on a schedule, a missed dose is never detected as 'missed' in the
 * database, no escalation ever starts, and no push/SMS/call ever fires — the
 * dashboard's "Missed" badge is computed live for display only and nothing
 * ever persists that state.
 *
 * Two steps, both idempotent (see escalationService.ts for the guards):
 *   1. checkAndEscalateMissedDoses() — first deactivates any medication
 *      whose endDate has passed (see deactivateExpiredMedications), then
 *      scans remaining active medications for doses that are 5min-24h
 *      overdue with no DoseLog yet, marks them 'missed', recalculates that
 *      day's AdherenceStats, and starts an EscalationState UNLESS the
 *      medication's escalation level is 'none' (e.g. a topical) — see
 *      escalationClassification.ts. Level 'reminder_only' fires only the t0
 *      push and is immediately capped; 'full' fires the complete chain.
 *   2. processActiveEscalations() — advances every still-active ('full'
 *      level only — 'reminder_only' escalations are capped, not active)
 *      escalation through its t15/t30/t60/t120 notification steps as time
 *      passes.
 *
 * Recommended schedule: every 5 minutes (see escalationService.ts and the
 * project notes for why — it matches the 5-minute detection threshold
 * already baked into checkAndEscalateMissedDoses, so no step can drift more
 * than 5 minutes from its target time).
 *
 * Call with: Authorization: Bearer <CRON_SECRET>
 * (matches CRON_SECRET already defined in .env.example, currently unused —
 * this route enforces it. check-refills/route.ts does NOT yet enforce its
 * equivalent commented-out check; consider adding it there too since it
 * also triggers real Twilio SMS sends from a public endpoint.)
 */
export async function GET(req: NextRequest) {
  const startedAt = new Date();
  let summary: Record<string, number> = {};
  let errorMessage: string | undefined;

  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('[check-missed-doses cron] CRON_SECRET is not set — this endpoint is running unauthenticated.');
    }

    await connectDB();

    const detection = await checkAndEscalateMissedDoses();
    const progression = await processActiveEscalations();

    summary = {
      medicationsDeactivated: detection.deactivatedCount,
      medicationsChecked: detection.medicationsChecked,
      missedDetected: detection.missedDetected,
      escalationsStarted: detection.escalationsStarted,
      escalationsSkippedStale: detection.escalationsSkippedStale,
      escalationsRateLimited: detection.escalationsRateLimited,
      isFirstRun: detection.isFirstRun ? 1 : 0,
      isLargeBacklog: detection.isLargeBacklog ? 1 : 0,
      detectionErrors: detection.errors,
      activeEscalations: progression.activeEscalations,
      stepsSent: progression.stepsSent,
      progressionErrors: progression.errors,
    };

    return NextResponse.json({ success: true, ...summary });
  } catch (error: any) {
    errorMessage = error.message;
    console.error('[check-missed-doses cron] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Always write a run log, even on failure, so a missing/failed run is
    // visible without having to dig through platform function logs.
    try {
      const finishedAt = new Date();
      await CronRunLog.create({
        jobName: 'check-missed-doses',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        summary,
        error: errorMessage,
      });
    } catch (logErr) {
      console.error('[check-missed-doses cron] Failed to write run log:', logErr);
    }
  }
}
