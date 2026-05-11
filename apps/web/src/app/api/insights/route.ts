import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import AdherenceStats from '@/models/AdherenceStats';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';

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

    return NextResponse.json({
      stats,
      summary: {
        overallAdherenceRate: overallRate,
        currentStreak: streak,
        totalDaysTaken: totalTaken,
        totalScheduled,
        activeMedications: activeMeds,
        needsRefill,
        daysTracked: stats.length,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
