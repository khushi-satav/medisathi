import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import AdherenceStats from '@/models/AdherenceStats';
import DoseLog from '@/models/DoseLog';
import { generateText } from '@/server/services/gemini';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const user = await User.findById(userPayload.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const stats = await AdherenceStats.findOne({ userId: user._id, date: todayStr });

    const todayDoses = await DoseLog.find({
      userId: user._id,
      scheduledDate: todayStr,
    }).populate('medicationId', 'name dosage');

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMissed = await DoseLog.find({
      userId: user._id,
      status: 'missed',
      scheduledTime: { $gte: last7Days },
    }).populate('medicationId', 'name');

    const dosesSummary = todayDoses.map(d => ({
      medication: (d.medicationId as any)?.name || 'Unknown',
      time: d.scheduledTime,
      status: d.status,
    }));

    const prompt = `Generate a brief, encouraging daily medication briefing for this patient:
- Name: ${user.name}
- Today's doses: ${JSON.stringify(dosesSummary)}
- Today's adherence: ${stats?.adherenceRate ?? 'N/A'}%
- Missed doses in last 7 days: ${recentMissed.length}

Keep it under 80 words. Use simple, warm language. 
If adherence is low, be motivating not alarming.
Include: what to take next, timing reminder, one encouragement line.`;

    const briefing = await generateText(prompt);

    return NextResponse.json({ briefing });
  } catch (error: any) {
    console.error('Daily briefing error:', error.message);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
