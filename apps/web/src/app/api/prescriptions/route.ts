import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';
import OpenAI from 'openai';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const prescriptions = await Prescription.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20);
    return NextResponse.json({ prescriptions });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { fileUrl, fileName, fileType, fileSize, imageBase64, mimeType } = body;

    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    // Create prescription record
    const prescription = await Prescription.create({
      userId: user.id,
      fileUrl,
      fileName: fileName || 'prescription',
      fileType: fileType || 'image/jpeg',
      fileSize: fileSize || 0,
      status: 'processing',
    });

    // Try AI extraction if OpenAI is configured and base64 provided
    if (process.env.OPENAI_API_KEY && imageBase64) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert medical prescription reader specializing in Indian prescriptions.
Extract all medications from the prescription image.

Return ONLY valid JSON with no markdown:
{
  "doctor": { "name": "", "registration": "", "hospital": "" },
  "patient": { "name": "", "age": "", "date": "" },
  "medicines": [
    {
      "name": "medicine name",
      "genericName": "generic name if visible",
      "dosage": "500mg",
      "form": "tablet",
      "frequency": "twice daily",
      "times": ["08:00", "20:00"],
      "foodInstruction": "after_meal",
      "duration": "30 days",
      "specialInstructions": "",
      "quantity": 60
    }
  ],
  "confidence": 0.95,
  "warnings": []
}

Rules:
- Correct medicine name spelling errors
- Infer times from frequency (once=["08:00"], twice=["08:00","20:00"], thrice=["08:00","14:00","20:00"])
- foodInstruction must be: after_meal | before_meal | with_meal | empty_stomach | any_time
- Parse "1-0-1" notation as morning+evening doses`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                    detail: 'high',
                  },
                },
                { type: 'text', text: 'Extract all medications from this prescription.' },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });

        const aiText = completion.choices[0].message.content || '';
        let aiExtracted: any = null;
        try {
          const match = aiText.match(/\{[\s\S]*\}/);
          aiExtracted = match ? JSON.parse(match[0]) : null;
        } catch { aiExtracted = null; }

        await Prescription.findByIdAndUpdate(prescription._id, {
          aiExtracted,
          aiConfidence: aiExtracted?.confidence,
          doctorName: aiExtracted?.doctor?.name,
          hospitalName: aiExtracted?.doctor?.hospital,
          status: 'ai_done',
        });

        return NextResponse.json({
          prescriptionId: prescription._id,
          extracted: aiExtracted,
          fileUrl,
          status: 'ai_done',
        });
      } catch (aiError: any) {
        console.error('AI extraction failed:', aiError.message);
        await Prescription.findByIdAndUpdate(prescription._id, { status: 'failed', errorMessage: aiError.message });
      }
    } else {
      await Prescription.findByIdAndUpdate(prescription._id, { status: 'ocr_done' });
    }

    return NextResponse.json({
      prescriptionId: prescription._id,
      extracted: null,
      fileUrl,
      status: process.env.OPENAI_API_KEY ? 'failed' : 'ocr_done',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
