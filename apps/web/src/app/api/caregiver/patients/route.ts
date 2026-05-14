import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const caregiver = await User.findById(userPayload.id).populate('caregiverLinks.userId');
    
    if (!caregiver || caregiver.role !== 'caregiver') {
      return NextResponse.json({ error: 'Access denied. Must be a caregiver.' }, { status: 403 });
    }

    // Extract the populated patients from the caregiverLinks array
    const patients = caregiver.caregiverLinks
      .filter((link: any) => link.isActive && link.userId)
      .map((link: any) => link.userId);

    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error('Caregiver patients error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
