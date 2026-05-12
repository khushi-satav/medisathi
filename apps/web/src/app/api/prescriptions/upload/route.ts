import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { v2 as cloudinary } from 'cloudinary';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


function mapFrequencyToTimes(frequency?: string): string[] {
  if (!frequency) return ['09:00'];
  const lowerFreq = frequency.toLowerCase();
  
  if (lowerFreq.includes('thrice') || lowerFreq.includes('three') || lowerFreq.includes('tds') || lowerFreq.includes('tid')) {
    return ['08:00', '14:00', '20:00'];
  }
  if (lowerFreq.includes('twice') || lowerFreq.includes('two') || lowerFreq.includes('bd') || lowerFreq.includes('bid')) {
    return ['08:00', '20:00'];
  }
  if (lowerFreq.includes('four') || lowerFreq.includes('qid')) {
    return ['08:00', '12:00', '16:00', '20:00'];
  }
  if (lowerFreq.includes('night') || lowerFreq.includes('bed') || lowerFreq.includes('hs')) {
    return ['21:00'];
  }
  if (lowerFreq.includes('morning') || lowerFreq.includes('am')) {
    return ['08:00'];
  }
  if (lowerFreq.includes('afternoon') || lowerFreq.includes('noon')) {
    return ['13:00'];
  }
  if (lowerFreq.includes('evening') || lowerFreq.includes('pm')) {
    return ['18:00'];
  }
  
  return ['09:00'];
}

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Cloudinary
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64Data}`;
    
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: `medisaathi/prescriptions/${userPayload.id}`
      });
    } catch (err: any) {
      console.error('Cloudinary upload failed:', err);
      return NextResponse.json({ error: 'Failed to upload image to cloud storage' }, { status: 502 });
    }

    // 2. OCR using Google Cloud Vision
    let ocrText = '';
    try {
      const visionClient = new vision.ImageAnnotatorClient();
      const [result] = await visionClient.textDetection(uploadResult.secure_url);
      ocrText = result.fullTextAnnotation?.text || '';
    } catch (err: any) {
      console.error('Google Cloud Vision failed:', err);
      // We can continue without OCR if we want to rely solely on OpenAI Vision, but here we just return error
      return NextResponse.json({ error: 'Image text extraction failed' }, { status: 502 });
    }

    // 3. GPT-4o parsing
    let parsedData = { medicines: [] as any[] };
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a medical AI. Extract medications from the prescription OCR text. Output strictly as JSON: { medicines: [{ name, dosage, frequency, duration, foodInstruction, form }] }"
          },
          { role: "user", content: `OCR TEXT: \n${ocrText}` }
        ]
      });
      parsedData = JSON.parse(aiResponse.choices[0].message.content || '{"medicines":[]}');
    } catch (err: any) {
      console.error('OpenAI parsing failed:', err);
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 });
    }

    // 4. Save Prescription record
    const prescription = await Prescription.create({
      userId: userPayload.id,
      fileUrl: uploadResult.secure_url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ocrRawText: ocrText,
      extractedData: parsedData,
      status: 'REVIEWED' // Simplify for demonstration
    });

    // 5. Optionally create draft medications or let user review first
    const addedMeds = [];
    for (const med of parsedData.medicines) {
      const newMed = await Medication.create({
        userId: userPayload.id,
        name: med.name,
        dosage: med.dosage,
        form: med.form?.toUpperCase() || 'TABLET',
        times: mapFrequencyToTimes(med.frequency),
        foodInstruction: med.foodInstruction?.toUpperCase().replace(' ', '_') || 'AFTER_MEAL',
        startDate: new Date(),
        stockCount: 30,
        prescriptionId: prescription._id,
        addedByOCR: true
      });
      addedMeds.push(newMed);
    }

    return NextResponse.json({ 
      success: true, 
      prescription,
      extractedMedicines: parsedData.medicines,
      medications: addedMeds
    });
  } catch (error: any) {
    console.error('OCR Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

