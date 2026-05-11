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

    const medication = await Medication.create({
      userId: user.id,
      name,
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

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
