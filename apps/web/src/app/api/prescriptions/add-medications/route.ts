import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';

// Add extracted medications from prescription to user's medication list
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { prescriptionId, selectedMedicines } = await req.json();

    const prescription = await Prescription.findOne({ _id: prescriptionId, userId: user.id });
    if (!prescription) return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });

    const medicines = selectedMedicines || prescription.aiExtracted?.medicines || [];
    const created = [];

    for (const med of medicines) {
      const medication = await Medication.create({
        userId: user.id,
        name: med.name,
        genericName: med.genericName,
        dosage: med.dosage,
        form: med.form || 'tablet',
        times: med.times || ['08:00'],
        foodInstruction: med.foodInstruction || 'after_meal',
        startDate: new Date(),
        stockCount: med.quantity || 30,
        isOngoing: true,
        addedByOCR: true,
        specialInstructions: med.specialInstructions,
        prescriptionId: prescription._id,
        interactions: med.interactions || [],
        sideEffects: med.sideEffects || [],
      });
      created.push(medication);
    }

    await Prescription.findByIdAndUpdate(prescriptionId, { status: 'added' });

    return NextResponse.json({ medications: created, count: created.length });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
