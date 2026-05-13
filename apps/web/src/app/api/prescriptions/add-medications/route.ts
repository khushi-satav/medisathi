import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Add extracted medications from prescription to user's medication list
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { prescriptionId, selectedMedicines } = await req.json();

    const prescription = await Prescription.findOne({ _id: prescriptionId, userId: user.id });
    if (!prescription) return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });

    const medicines = selectedMedicines || prescription.aiExtracted?.medicines || [];
    
    // --- MODIFICATION: Drug Interaction Check ---
    const existingMeds = await Medication.find({ userId: user.id, isActive: true });
    let interactionReport = "";
    
    if (existingMeds.length > 0 && medicines.length > 0 && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const existingNames = existingMeds.map(m => m.name).join(', ');
        const newNames = medicines.map((m: any) => m.name).join(', ');
        
        const prompt = `Check for serious drug-drug interactions between these two lists of medications:
        Existing: [${existingNames}]
        New: [${newNames}]
        
        If there are serious risks, list them briefly. If safe, say "No serious interactions detected".
        Return ONLY the summary text.`;
        
        const result = await model.generateContent(prompt);
        interactionReport = result.response.text();
      } catch (err) {
        console.error('Interaction check failed:', err);
      }
    }

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

    return NextResponse.json({ 
      medications: created, 
      count: created.length,
      interactionWarning: interactionReport 
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
