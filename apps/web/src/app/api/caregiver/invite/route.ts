import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the patient
    const patient = await User.findById(userPayload.id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Look for the caregiver by email
    let caregiver = await User.findOne({ email });

    // If caregiver doesn't exist, create a placeholder account
    if (!caregiver) {
      caregiver = new User({
        email,
        name: email.split('@')[0],
        role: 'caregiver',
        passwordHash: Math.random().toString(36).slice(-10), // Placeholder for invited user
        provider: 'credentials', // Temporary, they should reset password or sign in via Google
      });
      await caregiver.save();
    } else {
      // Ensure the existing user has caregiver role
      if (caregiver.role !== 'caregiver' && caregiver.role !== 'admin') {
        caregiver.role = 'caregiver';
      }
    }

    // Add Patient to Caregiver's caregiverLinks (if not already there)
    const alreadyLinked = caregiver.caregiverLinks?.some(
      (link: any) => link.userId?.toString() === patient._id.toString()
    );

    if (!alreadyLinked) {
      if (!caregiver.caregiverLinks) caregiver.caregiverLinks = [];
      caregiver.caregiverLinks.push({
        userId: patient._id,
        relationship: 'patient',
        permissions: ['read_logs', 'receive_alerts'],
        isActive: true,
      });
      await caregiver.save();
    }

    // Also add Caregiver to Patient's caregiverLinks
    const patientAlreadyLinked = patient.caregiverLinks?.some(
      (link: any) => link.userId?.toString() === caregiver._id.toString()
    );

    if (!patientAlreadyLinked) {
      if (!patient.caregiverLinks) patient.caregiverLinks = [];
      patient.caregiverLinks.push({
        userId: caregiver._id,
        relationship: 'caregiver',
        permissions: ['read_logs', 'receive_alerts'],
        isActive: true,
      });
      await patient.save();
    }

    return NextResponse.json({ success: true, message: 'Caregiver linked successfully!' });
  } catch (error: any) {
    console.error('Caregiver invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
