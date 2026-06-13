import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { doctorId } = body;

    if (!doctorId) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Fetch doctor info
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json({ error: 'Verified doctor not found' }, { status: 404 });
    }

    // Fetch patient info
    const patient = await User.findById(userPayload.id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Ensure doctorLinks array exists
    if (!patient.doctorLinks) {
      patient.doctorLinks = [];
    }

    // Check if link already exists
    const existingLinkIndex = patient.doctorLinks.findIndex(
      (link: any) => link.doctorId.toString() === doctorId
    );

    if (existingLinkIndex > -1) {
      // If already linked, make sure it is active
      patient.doctorLinks[existingLinkIndex].isActive = true;
      patient.doctorLinks[existingLinkIndex].name = doctor.name;
      patient.doctorLinks[existingLinkIndex].specialization = doctor.specialization;
    } else {
      // Add new link
      patient.doctorLinks.push({
        doctorId: doctor._id as any,
        name: doctor.name,
        specialization: doctor.specialization,
        isActive: true,
        linkedAt: new Date(),
      });
    }

    await patient.save();

    return NextResponse.json({
      success: true,
      message: `Successfully linked with ${doctor.name}`,
      doctorLinks: patient.doctorLinks,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/doctors/link] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { doctorId, isActive } = body;

    if (!doctorId) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive status must be a boolean.' }, { status: 400 });
    }

    // Fetch patient info
    const patient = await User.findById(userPayload.id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (!patient.doctorLinks) {
      patient.doctorLinks = [];
    }

    // Find the link
    const linkIndex = patient.doctorLinks.findIndex(
      (link: any) => link.doctorId.toString() === doctorId
    );

    if (linkIndex === -1) {
      return NextResponse.json({ error: 'Doctor link not found' }, { status: 404 });
    }

    // Update active status
    patient.doctorLinks[linkIndex].isActive = isActive;
    patient.markModified('doctorLinks');
    await patient.save();

    return NextResponse.json({
      success: true,
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} link with doctor.`,
      doctorLinks: patient.doctorLinks,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PATCH /api/doctors/link] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const url = new URL(req.url);
    let doctorId = url.searchParams.get('doctorId');

    if (!doctorId) {
      try {
        const body = await req.json();
        doctorId = body.doctorId;
      } catch {
        // ignore
      }
    }

    if (!doctorId) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Fetch patient info
    const patient = await User.findById(userPayload.id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (!patient.doctorLinks) {
      patient.doctorLinks = [];
    }

    const initialLength = patient.doctorLinks.length;
    patient.doctorLinks = patient.doctorLinks.filter(
      (link: any) => link.doctorId.toString() !== doctorId
    );

    if (patient.doctorLinks.length === initialLength) {
      return NextResponse.json({ error: 'Doctor link not found' }, { status: 404 });
    }

    patient.markModified('doctorLinks');
    await patient.save();

    return NextResponse.json({
      success: true,
      message: 'Successfully removed doctor link.',
      doctorLinks: patient.doctorLinks,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[DELETE /api/doctors/link] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

