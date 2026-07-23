import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Prescription from '@/models/Prescription';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseDurationToEndDate } from '@/lib/durationParser';
import { deriveDefaultEscalationLevel, needsEscalationLevelConfirmation, resolveMedicationForm } from '@/lib/escalationClassification';

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

    const flaggedForReview: { name: string; reason: string }[] = [];

    for (const med of medicines) {
      if (!med.name) continue;

      const cleanName = med.name.trim();
      // Undetermined/unrecognized form -> 'other' (least aggressive), never
      // 'tablet'. See escalationClassification.ts.
      const resolvedForm = resolveMedicationForm(med.form);

      // Duration -> endDate. Never silently invented: 'ongoing'/'chronic' etc.
      // sets isOngoing=true (a real signal from the text); missing or
      // unparseable duration sets needsDurationConfirmation=true instead of
      // guessing 30 days or assuming indefinite use — see durationParser.ts.
      const startDate = new Date();
      const duration = parseDurationToEndDate(startDate, med.duration);

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
        if (med.form) existingMed.form = resolvedForm;
        if (med.foodInstruction) existingMed.foodInstruction = ['before_meal','after_meal','with_meal','empty_stomach','any_time'].includes(med.foodInstruction?.toLowerCase()) ? med.foodInstruction.toLowerCase() : 'after_meal';
        if (med.specialInstructions) existingMed.specialInstructions = med.specialInstructions;

        // Update prescription ID association
        existingMed.prescriptionId = prescription._id;
        existingMed.addedByOCR = true;
        existingMed.isOngoing = duration.isOngoing;
        existingMed.endDate = duration.endDate;
        existingMed.needsDurationConfirmation = duration.needsConfirmation;

        // Backfill escalation classification for medications that predate
        // that field — the Medication pre-save hook only auto-classifies
        // brand-new documents (isNew), not updates, so a legacy record
        // being reactivated here would otherwise stay unclassified forever.
        if (!existingMed.escalationLevel) {
          existingMed.escalationLevel = deriveDefaultEscalationLevel(existingMed.form);
          existingMed.needsEscalationLevelConfirmation = needsEscalationLevelConfirmation(existingMed.form);
        }

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

        if (duration.needsConfirmation) flaggedForReview.push({ name: cleanName, reason: 'duration' });
        if (needsEscalationLevelConfirmation(existingMed.form)) flaggedForReview.push({ name: cleanName, reason: 'escalation_level' });
      } else {
        // Create new medication. escalationLevel/needsEscalationLevelConfirmation
        // are intentionally omitted — the Medication pre-save hook derives them
        // from `form` (see escalationClassification.ts).
        const medication = await Medication.create({
          userId: user.id,
          name: cleanName,
          genericName: med.genericName || '',
          dosage: med.dosage || '1 unit',
          form: resolvedForm,
          times: med.times && med.times.length ? med.times : ['08:00'],
          foodInstruction: ['before_meal','after_meal','with_meal','empty_stomach','any_time'].includes(med.foodInstruction?.toLowerCase()) ? med.foodInstruction.toLowerCase() : 'after_meal',
          startDate,
          endDate: duration.endDate,
          isOngoing: duration.isOngoing,
          needsDurationConfirmation: duration.needsConfirmation,
          stockCount: med.quantity || 30,
          addedByOCR: true,
          specialInstructions: med.specialInstructions || '',
          prescriptionId: prescription._id,
          interactions: med.interactions || [],
          sideEffects: med.sideEffects || [],
        });
        created.push(medication);

        if (duration.needsConfirmation) flaggedForReview.push({ name: cleanName, reason: 'duration' });
        if (needsEscalationLevelConfirmation(resolvedForm)) flaggedForReview.push({ name: cleanName, reason: 'escalation_level' });
      }
    }

    await Prescription.findByIdAndUpdate(prescriptionId, { status: 'added' });

    return NextResponse.json({
      medications: created,
      count: created.length,
      interactionWarning: interactionReport,
      // Medications whose course duration or escalation aggressiveness
      // could not be confidently inferred and need the user to confirm
      // them explicitly (see durationParser.ts / escalationClassification.ts).
      // Not fixed automatically here — surfaced so the add-medication UI can
      // prompt for it. Same medication can appear twice (once per reason).
      needsReview: flaggedForReview,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
