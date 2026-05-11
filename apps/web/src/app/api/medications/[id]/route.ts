import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await connectDB();
    const med = await Medication.findOne({ _id: params.id, userId: user.id });
    if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ medication: med });
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
      { new: true }
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
