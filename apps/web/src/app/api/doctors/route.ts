import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const doctors = await User.find({ role: 'doctor' })
      .select('name email specialization profilePhoto isVerified')
      .lean();

    return NextResponse.json({ success: true, doctors });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/doctors] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
