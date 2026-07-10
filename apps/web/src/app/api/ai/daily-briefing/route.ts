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
    
    // 1. Calculate Today's Doses taken vs total
    const todayDoses = await DoseLog.find({
      userId: user._id,
      scheduledDate: todayStr,
    });
    const dosesTotal = todayDoses.length;
    const dosesTaken = todayDoses.filter(d => d.status === 'taken').length;

    // 2. Calculate Missed Doses in last 7 days
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMissed = await DoseLog.find({
      userId: user._id,
      status: 'missed',
      scheduledTime: { $gte: last7Days },
    });
    const missedCount = recentMissed.length;

    // 3. Calculate Current Streak
    const statsAll = await AdherenceStats.find({ userId: user._id }).sort({ date: -1 });
    let streakDays = 0;
    for (const stat of statsAll) {
      if (stat.adherenceRate >= 80) {
        streakDays++;
      } else {
        break;
      }
    }

    // 4. Calculate Upcoming Refill Alerts
    const Medication = (await import('@/models/Medication')).default;
    const activeMeds = await Medication.find({ userId: user._id, isActive: true });
    const refillAlertsList: string[] = [];
    for (const med of activeMeds) {
      const dailyDosesCount = med.times.length || 1;
      const daysRemaining = Math.floor((med.stockCount || 0) / dailyDosesCount);
      if (daysRemaining <= (med.refillAlertDays || 7)) {
        refillAlertsList.push(`${med.name} (${daysRemaining} days remaining)`);
      }
    }
    const refillAlerts = refillAlertsList.length > 0 ? refillAlertsList.join(', ') : 'None';

    // 5. Gather Drug Interaction Warnings
    const allInteractions = activeMeds.reduce((acc: string[], med) => {
      if (med.interactions && med.interactions.length > 0) {
        acc.push(...med.interactions);
      }
      return acc;
    }, []);
    const interactionWarnings = allInteractions.length > 0 ? allInteractions.join(', ') : 'None';

    const languageNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      mr: 'Marathi',
      ta: 'Tamil',
      te: 'Telugu',
      bn: 'Bengali'
    };
    const targetLang = languageNames[user.language as string] || 'English';

    const prompt = `
Generate a 2-3 sentence daily medication briefing for the patient ${user.name}.
Data: 
- Doses today: ${dosesTaken}/${dosesTotal}
- Missed in last 7 days: ${missedCount}
- Current streak: ${streakDays} days
- Upcoming refill needed: ${refillAlerts}
- Any new drug interaction flags: ${interactionWarnings}

Only mention things that are actually true from this data. If nothing notable happened, say so briefly — don't pad with generic praise.
Turn it from a summary into a nudge:
- If a medication is running low, warn them (e.g. "Your Metformin supply runs out in X days").
- If there are drug interactions, alert them (e.g. "You added Aspirin yesterday — this may interact with your existing Warfarin. Ask your doctor").
- If they miss doses regularly on certain days, nudge them.
- If everything is perfect, keep it extremely brief and encouraging.

IMPORTANT: You MUST write the entire response in ${targetLang}. All text, greetings, and labels must be written in the ${targetLang} language and its native script (e.g. Devanagari script for Hindi/Marathi, Tamil script for Tamil, etc.). Do not write in transliterated/romanized format, write in the native script.`;

    const briefing = await generateText(prompt);

    return NextResponse.json({ briefing });
  } catch (error: any) {
    console.error('Daily briefing error:', error.message);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
