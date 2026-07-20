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

    // 4. Fetch active medications
    const Medication = (await import('@/models/Medication')).default;
    const activeMeds = await Medication.find({ userId: user._id, isActive: true });

    // BUG 2 FIX: Short-circuit when the user has no medications at all.
    // All data fields will be zero/empty, which the LLM misreads as "perfect
    // adherence". Return a structured signal instead — no LLM call is made.
    if (activeMeds.length === 0) {
      return NextResponse.json({ briefing: null, noMeds: true, interactions: [] });
    }

    // 5. Calculate Upcoming Refill Alerts
    const refillAlertsList: string[] = [];
    for (const med of activeMeds) {
      const dailyDosesCount = med.times.length || 1;
      const daysRemaining = Math.floor((med.stockCount || 0) / dailyDosesCount);
      if (daysRemaining <= (med.refillAlertDays || 7)) {
        refillAlertsList.push(`${med.name} (${daysRemaining} days remaining)`);
      }
    }
    const refillAlerts = refillAlertsList.length > 0 ? refillAlertsList.join(', ') : 'None';

    // BUG 3 FIX: Collect interaction warnings verbatim — do NOT pass them to
    // the LLM to rephrase.  They are returned as a structured array so the
    // client can render them with a fixed warning template, preventing the
    // model from softening or paraphrasing clinical safety information.
    const interactions: string[] = activeMeds.reduce((acc: string[], med) => {
      if (med.interactions && med.interactions.length > 0) {
        acc.push(...med.interactions);
      }
      return acc;
    }, []);

    // ── Locale resolution ─────────────────────────────────────────────────────
    const SUPPORTED_LANGUAGES_CODES = ['en', 'hi', 'mr', 'ta', 'te', 'bn'] as const;
    type SupportedLang = typeof SUPPORTED_LANGUAGES_CODES[number];

    // Read locale from the request body first.  This closes the race condition
    // where a language switch has been applied on the client but the DB write
    // hasn't committed yet.  Fall back to user.language from the DB, and
    // ultimately to 'en' if neither is a recognised value.
    let bodyLang: string | undefined;
    try {
      const body = await req.json();
      bodyLang = body?.language;
    } catch {
      // No body or malformed JSON — ignore and use DB value.
    }

    const rawLang = (bodyLang ?? user.language ?? 'en') as string;
    const targetLangCode: SupportedLang = (SUPPORTED_LANGUAGES_CODES as readonly string[]).includes(rawLang)
      ? (rawLang as SupportedLang)
      : 'en';

    const languageNames: Record<SupportedLang, string> = {
      en: 'English',
      hi: 'Hindi',
      mr: 'Marathi',
      ta: 'Tamil',
      te: 'Telugu',
      bn: 'Bengali'
    };
    const targetLang = languageNames[targetLangCode];

    // BUG 2 DEFENSE-IN-DEPTH: Explicit hasData flag prevents the model from
    // conflating "user has medications but zero activity yet today" with
    // "perfect adherence".  The model is instructed to treat them differently.
    const hasData = dosesTotal > 0 || missedCount > 0 || streakDays > 0;

    // BUG 3: Interaction warnings are intentionally omitted from the prompt.
    // The LLM writes only non-clinical narrative sentences; warnings are
    // returned verbatim in the `interactions` field and rendered by the client
    // using a fixed template so the wording cannot be softened or paraphrased.
    const prompt = `
Generate a 2-3 sentence daily medication briefing for the patient ${user.name}.
Data:
- hasData: ${hasData} (if false, the user has medications set up but no recorded activity yet — do NOT say "everything is fine" or imply good adherence)
- Doses today: ${dosesTaken}/${dosesTotal}
- Missed in last 7 days: ${missedCount}
- Current streak: ${streakDays} days
- Upcoming refill needed: ${refillAlerts}

Rules:
- Only mention things that are actually true from this data.
- If hasData is false, acknowledge there is no activity recorded yet and gently encourage the user to log their first dose — do NOT praise their adherence.
- If nothing notable happened beyond normal, keep it extremely brief.
- Do NOT mention or describe any drug interactions — those are handled separately.
- If a medication is running low, warn them specifically (e.g. "Your Metformin supply runs out in X days").
- If they miss doses regularly, nudge them.
- If everything is genuinely good (hasData is true, streak > 3, missedCount = 0), be brief and encouraging — but only if the data actually supports it.

IMPORTANT: You MUST write the entire response in ${targetLang}. All text must be in ${targetLang} using its native script (e.g. Devanagari for Hindi/Marathi, Tamil script for Tamil). Do not use transliterated/romanized text.`;

    const briefing = await generateText(prompt);

    // interactions is returned as a separate structured field.  The client
    // renders these verbatim with a fixed warning chip — the LLM never sees
    // or rephrases them.
    return NextResponse.json({ briefing, noMeds: false, interactions });
  } catch (error: any) {
    console.error('Daily briefing error:', error.message);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
