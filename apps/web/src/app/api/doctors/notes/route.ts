import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    if (userPayload.role !== 'doctor' && userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Must be a doctor.' }, { status: 403 });
    }

    const doctorId = userPayload.id;

    // Fetch doctor's details to get their name
    const doctor = await User.findById(doctorId).select('name');
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor details not found.' }, { status: 404 });
    }

    const { patientId, note } = await req.json();

    if (!patientId || !note?.trim()) {
      return NextResponse.json({ error: 'patientId and note content are required.' }, { status: 400 });
    }

    // Find patient and append note
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    if (!patient.doctorNotes) {
      patient.doctorNotes = [];
    }

    const newNote = {
      doctorId: doctor._id as any,
      doctorName: doctor.name,
      note: note.trim(),
      createdAt: new Date()
    };

    patient.doctorNotes.push(newNote);
    await patient.save();

    // Return the updated notes for this doctor
    const updatedNotes = patient.doctorNotes
      .filter((n: any) => n.doctorId.toString() === doctorId.toString())
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      message: 'Note added successfully',
      notes: updatedNotes
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/doctors/notes] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
