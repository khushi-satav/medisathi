import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { scanPrescription } from '@/lib/mlClient';

// Only import Gemini/Cloudinary if keys are configured
const hasGemini = !!process.env.GEMINI_API_KEY;
const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

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

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    // ─── Step 1: Upload to Cloudinary (optional) ──────────────────────────
    let fileUrl = '';
    if (hasCloudinary) {
      try {
        const { uploadToCloudinary } = await import('@/server/services/cloudinary');
        const dataUri = `data:${file.type};base64,${base64Data}`;
        fileUrl = await uploadToCloudinary(dataUri, userPayload.id, 'prescriptions');
      } catch (err: any) {
        console.warn('Cloudinary upload skipped:', err.message);
      }
    }
    // Fallback: store a placeholder URL (image is processed server-side anyway)
    if (!fileUrl) {
      fileUrl = `local://prescription/${userPayload.id}/${Date.now()}_${file.name}`;
    }

    // ─── Step 2: OCR — try ML API (PaddleOCR) first, then Gemini fallback ─
    let parsedData: any = null;
    let ocrSource = 'none';

    // Strategy A: ML API (PaddleOCR) — works locally, no API key needed
    try {
      console.log('Attempting OCR via ML API (PaddleOCR)...');
      const mlResult = await scanPrescription(buffer, file.name, file.type);

      if (mlResult?.success && mlResult.medicines?.length > 0) {
        ocrSource = 'paddleocr';
        parsedData = {
          doctor: { name: '', registration: '', hospital: '' },
          patient: { name: '', age: '', date: '' },
          medicines: mlResult.medicines.map((m: any) => ({
            name: m.name,
            genericName: m.genericName || '',
            dosage: m.dosage || '',
            form: m.form || 'tablet',
            frequency: m.frequency || 'Once daily',
            times: m.times || mapFrequencyToTimes(m.frequency),
            foodInstruction: m.foodInstruction || 'after_meal',
            duration: m.duration || '30 days',
            specialInstructions: m.instructions || '',
            quantity: m.quantity || 30,
          })),
          confidence: mlResult.medicines.reduce(
            (sum: number, m: any) => sum + (m.confidence || 70), 0
          ) / mlResult.medicines.length / 100,
          warnings: [],
          rawText: mlResult.raw_text,
        };
        console.log(`ML API OCR: found ${mlResult.medicines.length} medicines`);
      } else {
        console.log('ML API OCR: no medicines found, trying fallback...');
      }
    } catch (mlErr: any) {
      console.warn('ML API OCR failed:', mlErr.message);
    }

    // Strategy B: Gemini Vision fallback (requires API key)
    if (!parsedData && hasGemini) {
      try {
        console.log('Attempting OCR via Gemini Vision...');
        const { extractPrescription } = await import('@/server/services/gemini');
        parsedData = await extractPrescription(base64Data, file.type);
        ocrSource = 'gemini';
        console.log(`Gemini OCR: found ${parsedData?.medicines?.length || 0} medicines`);
      } catch (aiErr: any) {
        console.warn('Gemini Vision failed:', aiErr.message);
      }
    }

    // If both OCR strategies failed
    if (!parsedData || !parsedData.medicines?.length) {
      // Save prescription with failed status
      const prescription = await Prescription.create({
        userId: userPayload.id,
        fileUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: 'failed',
        errorMessage: 'Could not extract medicines. Please try a clearer image.',
      });

      return NextResponse.json({
        success: false,
        prescription: { _id: prescription._id },
        extractedMedicines: [],
        error: 'No medicines could be extracted. Try a clearer, well-lit photo of the prescription.',
      }, { status: 200 }); // 200 so frontend can show a helpful message
    }

    // ─── Step 3: Save Prescription record ────────────────────────────────
    const prescription = await Prescription.create({
      userId: userPayload.id,
      fileUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      aiExtracted: parsedData,
      aiConfidence: parsedData.confidence,
      ocrRawText: parsedData.rawText?.join('\n') || '',
      doctorName: parsedData.doctor?.name || '',
      hospitalName: parsedData.doctor?.hospital || '',
      status: 'ai_done',
    });

    // ─── Step 4: Auto-create Medications ─────────────────────────────────
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

    console.log(`Prescription processed: ${addedMeds.length} meds added via ${ocrSource}`);

    return NextResponse.json({
      success: true,
      prescription: { _id: prescription._id },
      prescriptionId: prescription._id,
      fileUrl,
      extracted: parsedData,
      extractedMedicines: parsedData.medicines || [],
      medications: addedMeds,
      confidence: parsedData.confidence,
      ocrSource,
    });

  } catch (error: any) {
    console.error('Prescription upload error:', error.message);
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
