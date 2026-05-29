import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') !== 'false';

    const query: any = { userId: user.id };
    if (activeOnly) query.isActive = true;

    const medications = await Medication.find(query).sort({ createdAt: -1 });

    const medsWithStock = medications.map(med => {
      const obj = med.toObject();
      const daysRemaining = med.times.length > 0
        ? Math.floor(med.stockCount / med.times.length)
        : 0;
      return { ...obj, daysRemaining };
    });

    return NextResponse.json({ medications: medsWithStock });
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
    const {
      name, dosage, form, times, foodInstruction,
      startDate, endDate, stockCount, condition,
      color, isOngoing, specialInstructions, genericName,
    } = body;

    if (!name || !dosage || !startDate) {
      return NextResponse.json({ error: 'Name, dosage, and startDate are required' }, { status: 400 });
    }

    const cleanName = name.trim();
    
    // Look for an existing medication (case-insensitive check)
    const existingMed = await Medication.findOne({
      userId: user.id,
      name: { $regex: new RegExp("^" + cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") }
    });

    let medication;

    if (existingMed) {
      // Reactivate soft-deleted medication, or update active one
      existingMed.isActive = true;
      
      // Merge scheduled times
      const allTimes = new Set([...(existingMed.times || []), ...(times || ['08:00'])]);
      existingMed.times = Array.from(allTimes).sort();
      
      // Update stock: add manual new stock to existing stock (if stockCount is provided)
      const additionalStock = Number(stockCount) ?? 30;
      existingMed.stockCount = Math.max(0, existingMed.stockCount || 0) + additionalStock;
      
      // Update fields with manually input values
      existingMed.dosage = dosage;
      existingMed.form = form || 'tablet';
      existingMed.foodInstruction = foodInstruction || 'after_meal';
      existingMed.startDate = new Date(startDate);
      existingMed.endDate = endDate ? new Date(endDate) : undefined;
      existingMed.isOngoing = isOngoing !== false;
      
      if (genericName !== undefined) existingMed.genericName = genericName;
      if (condition !== undefined) existingMed.condition = condition;
      if (color !== undefined) existingMed.color = color;
      if (specialInstructions !== undefined) existingMed.specialInstructions = specialInstructions;
      
      existingMed.updatedAt = new Date();
      await existingMed.save();
      medication = existingMed;
    } else {
      // Create new medication
      medication = await Medication.create({
        userId: user.id,
        name: cleanName,
        genericName,
        dosage,
        form: form || 'tablet',
        times: times || ['08:00'],
        foodInstruction: foodInstruction || 'after_meal',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        stockCount: stockCount ?? 30,
        condition,
        color: color || '#6C63FF',
        isOngoing: isOngoing !== false,
        specialInstructions,
      });
    }

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
