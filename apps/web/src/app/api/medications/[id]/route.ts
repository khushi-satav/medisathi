import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import DoseLog from '@/models/DoseLog';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await connectDB();
    const med = await Medication.findOne({ _id: params.id, userId: user.id });
    if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const obj = med.toObject();
    const dosesPerDay = med.times.length || 1;
    const dosesLoggedTaken = await DoseLog.countDocuments({ medicationId: med._id, status: 'taken' });
    
    const daysSupply = med.daysSupply !== undefined ? med.daysSupply : (med.stockCount ?? 30);
    const refillThreshold = med.refillThreshold !== undefined ? med.refillThreshold : (med.refillAlertDays ?? 7);
    
    const daysRemaining = Math.max(0, Math.floor(daysSupply - (dosesLoggedTaken / dosesPerDay)));
    
    const medicationWithStock = {
      ...obj,
      daysSupply,
      refillThreshold,
      daysRemaining
    };

    return NextResponse.json({ medication: medicationWithStock });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await connectDB();
    const body = await req.json();

    const medication = await Medication.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      body,
      { returnDocument: 'after' }
    );
    if (!medication) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ medication });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await connectDB();

    await Medication.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      { isActive: false }
    );
    return NextResponse.json({ message: 'Medication deactivated' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
