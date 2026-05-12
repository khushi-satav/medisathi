import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import AdherenceStats from '@/models/AdherenceStats';
import DoseLog from '@/models/DoseLog';
import Medication from '@/models/Medication';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const user = await User.findById(userPayload.id).populate('medications');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const stats = await AdherenceStats.findOne({ userId: user._id, date: todayStr });
    
    // Get today's doses
    const todayDoses = await DoseLog.find({ 
      userId: user._id,
      scheduledDate: todayStr 
    }).populate('medicationId');

    // Simple miss pattern: just recent missed doses
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMissed = await DoseLog.find({
      userId: user._id,
      status: 'missed',
      scheduledTime: { $gte: last7Days }
    }).populate('medicationId');

    const prompt = `
      Patient: ${user.name}, ${user.age}y
      Today's medications: ${JSON.stringify(todayDoses.map(d => ({
        med: (d.medicationId as any)?.name || 'Unknown',
        time: d.scheduledTime,
        status: d.status
      })))}
      Recent adherence: ${stats?.adherenceRate || 'Unknown'}%
      Recent missed: ${recentMissed.length} doses in last 7 days.
      
      Generate a personalized, encouraging daily medication briefing.
      Include: what to take next, timing tips, health encouragement.
      Keep it under 100 words. Use simple language.
      If adherence is low, be motivating not alarming.
    `;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are MediSaathi, a caring AI medication assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return NextResponse.json({ briefing: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Daily briefing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
