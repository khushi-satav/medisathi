import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';
import User from '@/models/User';
import { differenceInDays } from 'date-fns';

// ── Deterministic risk thresholds ─────────────────────────────────────────────
// Risk level is computed from the 7-day ADHERENCE PERCENTAGE, not from the
// raw DoseLog 'missed' count.  The count approach undercounted because
// in-flight 'overdue' doses are not persisted to DoseLog until background
// jobs run — so a user with 4 overdue doses at 9 PM could still show 0
// persisted missed records, giving a false LOW.
//
// The adherence percentage is derived from AdherenceStats (same source as
// the Weekly Adherence card) so the risk level is always consistent with
// what the user sees in that card.
//
// Code path for riskLevel (nothing else touches it):
//   1. 7-day taken/scheduled queried from AdherenceStats
//   2. adherencePct7d = Math.round(taken7d / scheduled7d * 100)
//   3. deterministicRisk = computeRiskLevel(adherencePct7d)
//   4. returned as riskLevel in the JSON response
//   No model output reaches this field.
//
// Thresholds (per spec):
//   adherencePct7d >= 80  → LOW
//   adherencePct7d >= 50  → MEDIUM
//   adherencePct7d <  50  → HIGH
//
// Insufficient-data state:
//   scheduled7d === 0 (no doses due in the window, account brand-new, or
//   no medications added yet) → insufficientData: true, riskLevel: null
//   The client renders no badge in this state.

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Compute risk level deterministically from the 7-day adherence percentage.
 * This is the ONLY function that produces a riskLevel value.  No model output
 * is accepted or forwarded as riskLevel anywhere in this route.
 */
function computeRiskLevel(adherencePct7d: number): RiskLevel {
  if (adherencePct7d >= 80) return 'LOW';
  if (adherencePct7d >= 50) return 'MEDIUM';
  return 'HIGH';
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const userData = await User.findById(user.id);
    if (!userData) throw new Error('User not found');

    // ── 1. Compute 7-day adherence percentage (deterministic risk input) ───────
    // This is the same calculation the Weekly Adherence card uses, so the risk
    // level will always be consistent with that number.
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const recentStats = await AdherenceStats.find({
      userId: user.id,
      date: { $gte: sevenDaysAgoStr, $lte: todayStr },
    });

    const taken7d  = recentStats.reduce((s, d) => s + (d.takenDoses  ?? 0), 0);
    const sched7d  = recentStats.reduce((s, d) => s + (d.totalDoses   ?? 0), 0);
    const missed7d = recentStats.reduce((s, d) => s + (d.missedDoses  ?? 0), 0);

    // adherencePct7d: taken / scheduled over the last 7 days.
    // If sched7d is 0 the user has no history → insufficientData.
    const adherencePct7d = sched7d > 0 ? Math.round((taken7d / sched7d) * 100) : 0;

    // ── 2. Insufficient-data guard ────────────────────────────────────────────
    const days_since_start = differenceInDays(new Date(), new Date(userData.createdAt)) || 1;
    const totalLogs = await DoseLog.countDocuments({ userId: user.id });

    if (sched7d === 0 || (days_since_start <= 1 && totalLogs === 0)) {
      return NextResponse.json({
        insufficientData: true,
        riskLevel: null,
        adherencePct7d: null,
        missRisk: null,
        riskFactors: [],
        recommendation: null,
      });
    }

    // ── 3. Deterministic risk level ───────────────────────────────────────────
    // computeRiskLevel() takes the adherence percentage.
    // Nothing else (ML output, LLM, fallback strings) can change this value.
    const deterministicRisk: RiskLevel = computeRiskLevel(adherencePct7d);

    // ── 4. Gather ML features (for missRisk score and riskFactors only) ───────
    const hour_of_day = now.getHours();
    const dayOfWeek   = now.getDay();
    const is_weekend  = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

    const activeMeds = await Medication.find({ userId: user.id, isActive: true });
    const frequency  = activeMeds.length > 0
      ? Math.round(activeMeds.reduce((acc, m) => acc + m.times.length, 0) / activeMeds.length)
      : 1;

    const recentLogs = await DoseLog.find({ userId: user.id })
      .sort({ scheduledTime: -1 })
      .limit(50);

    let adherence_streak = 0;
    for (const log of recentLogs) {
      if (log.status === 'taken')  { adherence_streak++; }
      else if (log.status === 'missed') { break; }
    }

    const avgStockDays = activeMeds.length > 0
      ? activeMeds.reduce((acc, m) => {
          const dailyDoses = m.times.length || 1;
          return acc + (m.stockCount / dailyDoses);
        }, 0) / activeMeds.length
      : 30;

    const mlPayload = {
      age: userData.age || 65,
      missed_doses_last_7d: missed7d,
      frequency,
      has_chronic_condition: (userData.conditions?.length || 0) > 0 ? 1 : 0,
      adherence_streak,
      hour_of_day,
      is_weekend,
      num_medications: activeMeds.length,
      days_since_start,
      stock_days_remaining: Math.round(avgStockDays),
    };

    // ── 5. Call ML API for missRisk score + riskFactors ───────────────────────
    // The ML model's riskLevel field is DISCARDED.  We accept only:
    //   • missRisk  — a 0-1 score for display
    //   • riskFactors — contextual bullet points
    //   • recommendation — only forwarded when there are real misses
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${mlApiUrl}/api/v1/predict/adherence-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': process.env.ML_API_SECRET || '',
        },
        body: JSON.stringify(mlPayload),
      });

      if (!response.ok) throw new Error('ML API responded with error');
      const mlResult = await response.json();

      return NextResponse.json({
        insufficientData: false,
        adherencePct7d,
        missRisk: mlResult.missRisk ?? null,
        // deterministicRisk is the only value that reaches riskLevel.
        // mlResult.riskLevel is intentionally not read.
        riskLevel: deterministicRisk,
        riskFactors: mlResult.riskFactors ?? [],
        recommendation: missed7d > 0 ? (mlResult.recommendation ?? null) : null,
      });
    } catch (mlErr) {
      console.error('ML Prediction failed, using fallback:', mlErr);

      // Fallback path: ML API down.  riskLevel still comes from arithmetic.
      const fallbackRiskFactors: string[] = [];
      if (missed7d > 0) {
        fallbackRiskFactors.push(
          `${missed7d} missed dose${missed7d > 1 ? 's' : ''} in the last 7 days.`
        );
      }
      if (adherencePct7d < 80) {
        fallbackRiskFactors.push(`7-day adherence is ${adherencePct7d}%.`);
      }

      return NextResponse.json({
        insufficientData: false,
        adherencePct7d,
        missRisk: null,
        riskLevel: deterministicRisk,
        riskFactors: fallbackRiskFactors,
        recommendation: missed7d > 0
          ? 'Set an extra reminder for missed doses and consult your caregiver if this continues.'
          : null,
        isFallback: true,
      });
    }

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
