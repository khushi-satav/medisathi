import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    await connectDB();

    const user = await User.findById(authUser.id).select('-passwordHash');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    await connectDB();
    const updates = await req.json();

    // Don't allow changing sensitive fields via this route
    delete updates.passwordHash;
    delete updates.role;
    delete updates.email;

    const user = await User.findByIdAndUpdate(authUser.id, updates, { new: true }).select('-passwordHash');
    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
