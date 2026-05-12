import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const caregiver = await User.findById(userPayload.id).populate('managedPatients');
    if (!caregiver || caregiver.role !== 'CAREGIVER') {
      return NextResponse.json({ error: 'Access denied. Must be a caregiver.' }, { status: 403 });
    }

    // In a real app we'd use CaregiverLink model to find patients, 
    // but assuming managedPatients relation or similar schema for simplicity
    const patients = caregiver.managedPatients || [];

    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error('Caregiver patients error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
