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

    // Overall adherence
    const totalTaken = stats.reduce((s, d) => s + d.takenDoses, 0);
    const totalScheduled = stats.reduce((s, d) => s + d.totalDoses, 0);
    const overallRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    // Current streak
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    const sortedDesc = [...stats].sort((a, b) => b.date.localeCompare(a.date));
    for (const day of sortedDesc) {
      if (day.adherenceRate >= 80) streak++;
      else break;
    }

    // Active medications count
    const activeMeds = await Medication.countDocuments({ userId: user.id, isActive: true });

    // Medications needing refill
    const meds = await Medication.find({ userId: user.id, isActive: true });
    const needsRefill = meds.filter(m => {
      const daysLeft = m.times.length > 0 ? Math.floor(m.stockCount / m.times.length) : 0;
      return daysLeft <= m.refillAlertDays;
    }).length;

    // Calculate missed and skipped doses
    const totalMissed = stats.reduce((s, d) => s + d.missedDoses, 0);
    const totalSkipped = stats.reduce((s, d) => s + d.skippedDoses, 0);

    // Calculate longest streak
    let longestStreak = 0;
    let currentTempStreak = 0;
    for (const day of stats) {
      if (day.adherenceRate >= 80) {
        currentTempStreak++;
        if (currentTempStreak > longestStreak) longestStreak = currentTempStreak;
      } else {
        currentTempStreak = 0;
      }
    }

    // Daily trend
    const dailyTrend = stats.map(day => ({
      date: day.date,
      adherencePct: day.adherenceRate,
    }));

    // By Medication
    const logs = await DoseLog.find({
      userId: user.id,
      scheduledDate: { $gte: startStr, $lte: endStr },
    }).populate('medicationId', 'name');

    const medStats: Record<string, { name: string; taken: number; total: number }> = {};
    for (const log of logs) {
      if (!log.medicationId) continue;
      const medId = log.medicationId._id.toString();
      const name = log.medicationId.name;
      
      if (!medStats[medId]) medStats[medId] = { name, taken: 0, total: 0 };
      
      medStats[medId].total++;
      if (log.status === 'taken') medStats[medId].taken++;
    }

    const byMedication = Object.values(medStats).map(med => ({
      ...med,
      adherencePercentage: med.total > 0 ? Math.round((med.taken / med.total) * 100) : 0,
    }));

    // Call the real ML API for real-time risk assessment
    const now = new Date();
    const prediction = await predictAdherenceRisk({
      userId: user.id,
      age: 45, // Demo default
      missed_doses_last_7d: totalMissed,
      frequency: activeMeds > 0 ? 2 : 1, // Approximation for average frequency
      has_chronic_condition: true,
      adherence_streak: streak,
      hour_of_day: now.getHours(),
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      num_medications: activeMeds,
      days_since_start: 90, // Demo default
      stock_days_remaining: 15, // Demo default
    });

    let riskLevel = 'unknown';
    let aiInsights: string[] = [];

    if (prediction) {
      riskLevel = prediction.riskLevel.toLowerCase();
      // Map ML risk factors and recommendation to the insights list
      aiInsights = [...prediction.riskFactors, prediction.recommendation];
    } else {
      // Fallback if ML API is down
      if (overallRate >= 80) riskLevel = 'low';
      else if (overallRate >= 50) riskLevel = 'medium';
      else if (overallRate > 0) riskLevel = 'high';

      if (riskLevel === 'low') aiInsights.push("Your adherence is excellent. Keep it up!");
      if (riskLevel === 'medium') aiInsights.push("Consider setting an extra alarm for the afternoon doses, as those are often missed.");
      if (riskLevel === 'high') aiInsights.push("Your recent missed doses could affect your treatment. Please talk to your caregiver.");
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
