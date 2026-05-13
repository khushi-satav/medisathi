import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import { generateText } from '@/server/services/gemini';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    await connectDB();
    const meds = await Medication.find({ userId: userPayload.id, isActive: true });
    const medList = meds.map(m => `${m.name} ${m.dosage}`).join(', ') || 'No active medications';

    const prompt = `Patient's current medications: ${medList}.

Patient's question: ${question}

Answer clearly and safely. Recommend consulting a doctor for medical decisions. Never suggest stopping medication without doctor advice. Keep response under 150 words.`;

    const answer = await generateText(
      prompt,
      'You are MediSaathi, a caring AI medication assistant for Indian patients. Be concise, clear, and supportive.'
    );

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error('AI Ask error:', error.message);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
