import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import { requireAuth } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const prescriptions = await Prescription.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({ prescriptions });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
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

    // Use Gemini Vision if base64 image is provided (FREE)
    if (process.env.GEMINI_API_KEY && imageBase64) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are an expert medical prescription reader specializing in Indian prescriptions.
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
- foodInstruction must be: after_meal | before_meal | with_meal | empty_stomach | any_time
- Infer times from frequency (once=["08:00"], twice=["08:00","20:00"], thrice=["08:00","14:00","20:00"])
- Parse "1-0-1" notation as morning+evening doses`;

        const imagePart = {
          inlineData: {
            data: imageBase64,
            mimeType: (mimeType || 'image/jpeg') as string,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const aiText = result.response.text();

        let aiExtracted: any = null;
        try {
          const match = aiText.match(/\{[\s\S]*\}/);
          aiExtracted = match ? JSON.parse(match[0]) : null;
        } catch {
          aiExtracted = null;
        }

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
        console.error('Gemini extraction failed:', aiError.message);
        await Prescription.findByIdAndUpdate(prescription._id, {
          status: 'failed',
          errorMessage: aiError.message,
        });
      }
    } else {
      await Prescription.findByIdAndUpdate(prescription._id, { status: 'pending' });
    }

    return NextResponse.json({
      prescriptionId: prescription._id,
      extracted: null,
      fileUrl,
      status: 'pending',
    });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
