import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    // 1. Gather features for ML prediction
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

    // Get stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const stats = await AdherenceStats.find({
      userId: user.id,
      date: { $gte: thirtyDaysAgoStr, $lte: todayStr }
    }).sort({ date: -1 });

    const avgAdherence30d = stats.length > 0 
      ? stats.reduce((acc, s) => acc + s.adherenceRate, 0) / stats.length 
      : 85;
    
    const avgAdherence7d = stats.slice(0, 7).length > 0
      ? stats.slice(0, 7).reduce((acc, s) => acc + s.adherenceRate, 0) / stats.slice(0, 7).length
      : 85;

    // Get recent logs for streaks/consecutive misses
    const recentLogs = await DoseLog.find({ userId: user.id })
      .sort({ scheduledTime: -1 })
      .limit(10);

    let consecutiveTaken = 0;
    let consecutiveMissed = 0;
    for (const log of recentLogs) {
      if (log.status === 'taken') {
        consecutiveTaken++;
        if (consecutiveMissed > 0) break;
      } else if (log.status === 'missed') {
        consecutiveMissed++;
        if (consecutiveTaken > 0) break;
      }
    }

    // Number of meds
    const numberOfMeds = await Medication.countDocuments({ userId: user.id, isActive: true });

    // Stock days remaining (average)
    const activeMeds = await Medication.find({ userId: user.id, isActive: true });
    const avgStockDays = activeMeds.length > 0
      ? activeMeds.reduce((acc, m) => {
          const dailyDoses = m.times.length || 1;
          return acc + (m.stockCount / dailyDoses);
        }, 0) / activeMeds.length
      : 30;

    const features = {
      hour,
      dayOfWeek,
      isWeekend,
      avgAdherence7d,
      avgAdherence30d,
      consecutiveTaken,
      consecutiveMissed,
      numberOfMeds,
      stockDaysRemaining: Math.round(avgStockDays),
      isMorning: hour >= 5 && hour < 12 ? 1 : 0,
      isAfternoon: hour >= 12 && hour < 17 ? 1 : 0,
      isEvening: hour >= 17 && hour < 22 ? 1 : 0,
    };

    // 2. Call ML API
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${mlApiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': process.env.ML_API_SECRET || ''
        },
        body: JSON.stringify({
          userId: user.id,
          targetDate: todayStr,
          features
        })
      });

      if (!response.ok) {
        throw new Error('ML API responded with error');
      }

      const prediction = await response.json();
      return NextResponse.json(prediction);
    } catch (mlErr) {
      console.error('ML Prediction failed, using fallback:', mlErr);
      
      // Fallback heuristic if ML API is down
      const missRisk = avgAdherence7d < 70 ? 0.6 : 0.2;
      return NextResponse.json({
        missRisk,
        riskLevel: missRisk > 0.5 ? 'HIGH' : 'LOW',
        riskFactors: avgAdherence7d < 70 ? ['Low weekly adherence'] : [],
        recommendation: missRisk > 0.5 ? 'Set an extra reminder for your next dose.' : 'Keep up the good work!',
        isFallback: true
      });
    }

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
