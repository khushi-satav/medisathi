import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import AdherenceStats from '@/models/AdherenceStats';
import { requireAuth } from '@/lib/auth';
import User from '@/models/User';
import { differenceInDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const userData = await User.findById(user.id);
    if (!userData) throw new Error('User not found');

    // 1. Gather features for ML prediction
    const now = new Date();
    const hour_of_day = now.getHours();
    const dayOfWeek = now.getDay();
    const is_weekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

    // missed_doses_last_7d
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const missed_doses_last_7d = await DoseLog.countDocuments({
      userId: user.id,
      status: 'missed',
      scheduledTime: { $gte: sevenDaysAgo }
    });

    // frequency (average doses per day)
    const activeMeds = await Medication.find({ userId: user.id, isActive: true });
    const frequency = activeMeds.length > 0
      ? Math.round(activeMeds.reduce((acc, m) => acc + m.times.length, 0) / activeMeds.length)
      : 1;

    // adherence_streak (current streak of 'taken')
    const recentLogs = await DoseLog.find({ userId: user.id })
      .sort({ scheduledTime: -1 })
      .limit(50);

    let adherence_streak = 0;
    for (const log of recentLogs) {
      if (log.status === 'taken') {
        adherence_streak++;
      } else if (log.status === 'missed') {
        break;
      }
    }

    // stock_days_remaining
    const avgStockDays = activeMeds.length > 0
      ? activeMeds.reduce((acc, m) => {
          const dailyDoses = m.times.length || 1;
          return acc + (m.stockCount / dailyDoses);
        }, 0) / activeMeds.length
      : 30;

    const days_since_start = differenceInDays(new Date(), new Date(userData.createdAt)) || 1;

    const payload = {
      age: userData.age || 65,
      missed_doses_last_7d,
      frequency,
      has_chronic_condition: (userData.conditions?.length || 0) > 0 ? 1 : 0,
      adherence_streak,
      hour_of_day,
      is_weekend,
      num_medications: activeMeds.length,
      days_since_start,
      stock_days_remaining: Math.round(avgStockDays)
    };

    // 2. Call ML API
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${mlApiUrl}/api/v1/predict/adherence-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': process.env.ML_API_SECRET || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('ML API responded with error');
      }

      const prediction = await response.json();
      return NextResponse.json(prediction);
    } catch (mlErr) {
      console.error('ML Prediction failed, using fallback:', mlErr);
      
      // Fallback heuristic if ML API is down
      const missRisk = payload.missed_doses_last_7d > 2 ? 0.6 : 0.2;
      return NextResponse.json({
        missRisk,
        riskLevel: missRisk > 0.5 ? 'HIGH' : 'LOW',
        riskFactors: payload.missed_doses_last_7d > 2 ? ['Multiple missed doses recently'] : [],
        recommendation: missRisk > 0.5 ? 'Set an extra reminder for your next dose.' : 'Keep up the good work!',
        isFallback: true
      });
    }

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
