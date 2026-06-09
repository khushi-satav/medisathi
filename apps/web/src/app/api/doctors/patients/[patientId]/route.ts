import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import Medication from '@/models/Medication';
import DoseLog from '@/models/DoseLog';
import AdherenceStats from '@/models/AdherenceStats';

export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    if (userPayload.role !== 'doctor' && userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Must be a doctor.' }, { status: 403 });
    }

    const doctorId = userPayload.id;
    const { patientId } = params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required.' }, { status: 400 });
    }

    // Find the patient
    const patient = await User.findById(patientId)
      .select('name email phone age gender conditions doctorNotes emergencyContacts profilePhoto doctorLinks')
      .lean();

    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    // Verify the doctor is linked to this patient
    const isLinked = (patient.doctorLinks || []).some(
      (link: any) => link.doctorId.toString() === doctorId.toString() && link.isActive
    );

    if (!isLinked && userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. You are not linked to this patient.' }, { status: 403 });
    }

    // Fetch medications
    const medications = await Medication.find({ userId: patientId }).lean();

    // Fetch recent dose logs
    const doseLogs = await DoseLog.find({ userId: patientId })
      .populate('medicationId', 'name color dosage')
      .sort({ scheduledTime: -1 })
      .limit(50)
      .lean();

    // Fetch adherence stats
    const adherenceStats = await AdherenceStats.find({ userId: patientId })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    // Filter notes by this doctor
    const notes = (patient.doctorNotes || [])
      .filter((n: any) => n.doctorId.toString() === doctorId.toString())
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      patient: {
        ...patient,
        notes,
      },
      medications,
      doseLogs,
      adherenceStats,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/doctors/patients/[patientId]] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    if (userPayload.role !== 'doctor' && userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Must be a doctor.' }, { status: 403 });
    }

    const doctorId = userPayload.id;
    const { patientId } = params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive status must be a boolean.' }, { status: 400 });
    }

    // Find the patient
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    // Find the link
    const linkIndex = (patient.doctorLinks || []).findIndex(
      (link: any) => link.doctorId.toString() === doctorId.toString()
    );

    if (linkIndex === -1) {
      return NextResponse.json({ error: 'Access denied. You are not linked to this patient.' }, { status: 403 });
    }

    // Update active status
    patient.doctorLinks[linkIndex].isActive = isActive;
    
    patient.markModified('doctorLinks');
    await patient.save();

    return NextResponse.json({
      success: true,
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} link with patient.`,
      isActive,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PATCH /api/doctors/patients/[patientId]] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
