import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, phone, password, age, gender, conditions } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await User.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    });
    if (existing) {
      return NextResponse.json({ error: 'User already exists with this email or phone' }, { status: 400 });
    }

    const user = await User.create({
      name,
      email,
      phone: phone || undefined,
      age: age || undefined,
      gender: gender || undefined,
      passwordHash: password,
      conditions: conditions || [],
      role: 'patient',
    });

    const token = generateToken(user._id.toString(), user.role);

    return NextResponse.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        language: user.language,
        conditions: user.conditions,
        isVerified: user.isVerified,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
