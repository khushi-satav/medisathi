import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import DoseLog from '@/models/DoseLog';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';
import { predictAdherenceRisk } from '@/lib/mlClient';

/**
 * GET /api/predictions?medicationId=xxx
 * Returns ML-powered adherence risk prediction for a patient's next dose.
 */
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const medicationId = searchParams.get('medicationId');

    // Gather context from the database to build ML features
    const activeMeds = await Medication.find({ userId: user.id, isActive: true });
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDayStr = sevenDaysAgo.toISOString().split('T')[0];

    const recentLogs = await DoseLog.find({
      userId: user.id,
      scheduledDate: { $gte: sevenDayStr },
    });

    const missedLast7d = recentLogs.filter(l => l.status === 'missed').length;

    // Compute streak from AdherenceStats
    const recentStats = await AdherenceStats.find({ userId: user.id })
      .sort({ date: -1 })
      .limit(30);
    let streak = 0;
    for (const day of recentStats) {
      if (day.adherenceRate >= 80) streak++;
      else break;
    }

    // Pick the target medication or use aggregate data
    let targetMed = activeMeds[0];
    if (medicationId) {
      targetMed = activeMeds.find(m => m._id.toString() === medicationId) || activeMeds[0];
    }

    if (!targetMed) {
      return NextResponse.json({
        prediction: null,
        message: 'No active medications found',
      });
    }

    const daysSinceStart = Math.floor(
      (now.getTime() - new Date(targetMed.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const stockDaysRemaining = targetMed.times.length > 0
      ? Math.floor(targetMed.stockCount / targetMed.times.length)
      : 30;

    // Call ML API
    const prediction = await predictAdherenceRisk({
      userId: user.id,
      age: 30, // Default since we don't always have this in User model via this route
      missed_doses_last_7d: missedLast7d,
      frequency: targetMed.times.length,
      has_chronic_condition: targetMed.condition ? true : false,
      adherence_streak: streak,
      hour_of_day: now.getHours(),
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      num_medications: activeMeds.length,
      days_since_start: daysSinceStart,
      stock_days_remaining: stockDaysRemaining,
      medicationId: targetMed._id.toString(),
    });

    return NextResponse.json({
      prediction,
      context: {
        medicationName: targetMed.name,
        missedLast7d,
        streak,
        activeMedications: activeMeds.length,
        stockDaysRemaining,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
