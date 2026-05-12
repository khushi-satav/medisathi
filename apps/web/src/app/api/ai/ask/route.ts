import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    await connectDB();

    const meds = await Medication.find({ userId: userPayload.id, isActive: true });
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful medication assistant. 
          Patient's medications: ${meds.map(m => `${m.name} ${m.dosage}`).join(', ')}.
          Answer clearly, safely. Always recommend consulting doctor for medical decisions.
          Never suggest stopping medication without doctor advice.`
        },
        { role: 'user', content: question }
      ],
      max_tokens: 300
    });

    return NextResponse.json({ answer: response.choices[0].message.content });
  } catch (error: any) {
    console.error('AI Ask error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
