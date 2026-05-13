import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { uploadToCloudinary } from '@/server/services/cloudinary';
import { extractPrescription } from '@/server/services/gemini';

function mapFrequencyToTimes(frequency?: string): string[] {
  if (!frequency) return ['09:00'];
  const f = frequency.toLowerCase();
  if (f.includes('thrice') || f.includes('tds') || f.includes('tid') || f.includes('three')) return ['08:00', '14:00', '20:00'];
  if (f.includes('twice') || f.includes('bd') || f.includes('bid') || f.includes('two')) return ['08:00', '20:00'];
  if (f.includes('four') || f.includes('qid')) return ['08:00', '12:00', '16:00', '20:00'];
  if (f.includes('night') || f.includes('bed') || f.includes('hs')) return ['21:00'];
  if (f.includes('morning')) return ['08:00'];
  if (f.includes('afternoon') || f.includes('noon')) return ['13:00'];
  if (f.includes('evening')) return ['18:00'];
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

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64Data}`;

    // ─── Step 1: Upload to Cloudinary (FREE tier) ───────────────────────────
    let fileUrl = '';
    try {
      fileUrl = await uploadToCloudinary(dataUri, userPayload.id, 'prescriptions');
    } catch (err: any) {
      console.error('Cloudinary upload failed:', err.message);
      // Fallback: store as data URI (not recommended for production)
      fileUrl = `data:${file.type};base64,${base64Data.slice(0, 100)}...`;
    }

    // ─── Step 2: Gemini Vision — OCR + Parse (FREE) ─────────────────────────
    let parsedData: any = { medicines: [], doctor: {}, patient: {}, confidence: 0, warnings: [] };
    try {
      parsedData = await extractPrescription(base64Data, file.type);
    } catch (aiErr: any) {
      console.error('Gemini Vision failed:', aiErr.message);
      return NextResponse.json(
        { error: 'AI prescription analysis failed. Please try a clearer image.' },
        { status: 502 }
      );
    }

    // ─── Step 3: Save Prescription record ────────────────────────────────────
    const prescription = await Prescription.create({
      userId: userPayload.id,
      fileUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      aiExtracted: parsedData,
      aiConfidence: parsedData.confidence,
      doctorName: parsedData.doctor?.name || '',
      hospitalName: parsedData.doctor?.hospital || '',
      status: 'ai_done',
    });

    // ─── Step 4: Auto-create Medications ─────────────────────────────────────
    const addedMeds = [];
    for (const med of parsedData.medicines || []) {
      try {
        const newMed = await Medication.create({
          userId: userPayload.id,
          name: med.name,
          genericName: med.genericName || '',
          dosage: med.dosage || '',
          form: med.form?.toLowerCase() || 'tablet',
          times: med.times?.length ? med.times : mapFrequencyToTimes(med.frequency),
          foodInstruction: med.foodInstruction || 'after_meal',
          startDate: new Date(),
          stockCount: med.quantity || 30,
          prescriptionId: prescription._id,
          addedByOCR: true,
          specialInstructions: med.specialInstructions || '',
        });
        addedMeds.push(newMed);
      } catch (medErr: any) {
        console.error('Failed to save medication:', med.name, medErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      prescriptionId: prescription._id,
      fileUrl,
      extracted: parsedData,
      extractedMedicines: parsedData.medicines || [],
      medications: addedMeds,
      confidence: parsedData.confidence,
    });

  } catch (error: any) {
    console.error('Prescription upload error:', error.message);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
