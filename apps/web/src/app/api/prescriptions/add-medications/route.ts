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

    if (prescription.status === 'added') {
      return NextResponse.json({ error: 'Medications from this prescription have already been added' }, { status: 400 });
    }

    const medicines = selectedMedicines || prescription.aiExtracted?.medicines || [];
    
    // --- MODIFICATION: Drug Interaction Check ---
    const existingMeds = await Medication.find({ userId: user.id, isActive: true });
    let interactionReport = "";
    
    if (existingMeds.length > 0 && medicines.length > 0 && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
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
      if (!med.name) continue;
      
      const cleanName = med.name.trim();
      
      // Look for an existing medication (case-insensitive check)
      const existingMed = await Medication.findOne({
        userId: user.id,
        name: { $regex: new RegExp("^" + cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") }
      });

      if (existingMed) {
        // Update/reactivate the existing medication instead of creating a duplicate
        existingMed.isActive = true;
        
        // Merge scheduled times
        const allTimes = new Set([...(existingMed.times || []), ...(med.times || ['08:00'])]);
        existingMed.times = Array.from(allTimes).sort();
        
        // Update stock: add new quantity to existing stock
        const newQty = Number(med.quantity) || 30;
        existingMed.stockCount = Math.max(0, existingMed.stockCount || 0) + newQty;
        
        // Update other details from OCR if provided, preserving existing ones if not
        if (med.genericName) existingMed.genericName = med.genericName;
        if (med.dosage) existingMed.dosage = med.dosage;
        if (med.form) existingMed.form = med.form;
        if (med.foodInstruction) existingMed.foodInstruction = med.foodInstruction;
        if (med.specialInstructions) existingMed.specialInstructions = med.specialInstructions;
        
        // Update prescription ID association
        existingMed.prescriptionId = prescription._id;
        existingMed.addedByOCR = true;
        existingMed.isOngoing = true;
        
        // Merge interactions and side effects lists
        if (med.interactions && med.interactions.length > 0) {
          existingMed.interactions = Array.from(new Set([...(existingMed.interactions || []), ...med.interactions]));
        }
        if (med.sideEffects && med.sideEffects.length > 0) {
          existingMed.sideEffects = Array.from(new Set([...(existingMed.sideEffects || []), ...med.sideEffects]));
        }
        
        existingMed.updatedAt = new Date();
        await existingMed.save();
        created.push(existingMed);
      } else {
        // Create new medication
        const medication = await Medication.create({
          userId: user.id,
          name: cleanName,
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
