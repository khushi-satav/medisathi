/**
 * POST /api/caregiver/invite
 * ──────────────────────────
 * Patient sends a caregiver invitation.
 * Creates a CaregiverInvite record with a secure token and sends an email.
 *
 * GET /api/caregiver/invite
 * ──────────────────────────
 * Returns all invitations sent BY the current patient, plus invitations
 * received at the current user's email (so they can accept/reject them).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import twilio from 'twilio';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import CaregiverInvite from '@/models/CaregiverInvite';
import { sendEmail, caregiverInviteEmailHtml } from '@/lib/email';

/* ── POST — send invite ─────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { email, phone, relationship, permissions, message } = body as {
      email: string;
      phone?: string;
      relationship: string;
      permissions?: string[];
      message?: string;
    };

    if (!email || !relationship) {
      return NextResponse.json(
        { error: 'Email and relationship are required' },
        { status: 400 }
      );
    }

    // Fetch patient
    const patient = await User.findById(userPayload.id).select('name email caregiverLinks');
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const alreadyLinked = patient.caregiverLinks?.some(
      (l: any) => l.email === email.toLowerCase() && l.isActive
    );
    if (alreadyLinked) {
      return NextResponse.json({ error: 'Already connected with this caregiver' }, { status: 400 });
    }

    // Prevent self-invite
    if (patient.email === email.toLowerCase()) {
      return NextResponse.json(
        { error: 'You cannot invite yourself as a caregiver' },
        { status: 400 }
      );
    }

    // Check for existing active invite to this email
    const existing = await CaregiverInvite.findOne({
      patientId: patient._id,
      caregiverEmail: email.toLowerCase(),
      status: 'pending',
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const acceptUrl = `${appUrl}/invite/accept?token=${token}`;
    const rejectUrl = `${appUrl}/invite/reject?token=${token}`;

    // Persist invite
    const invite = await CaregiverInvite.create({
      patientId: patient._id,
      caregiverEmail: email.toLowerCase(),
      relationship,
      permissions: permissions ?? ['read_logs', 'receive_alerts'],
      token,
      message,
      status: 'pending',
    });

    // Send invitation email
    await sendEmail({
      to: email,
      subject: `${patient.name} has invited you to be their caregiver on MediSaathi`,
      html: caregiverInviteEmailHtml({
        patientName: patient.name,
        relationship,
        message,
        acceptUrl,
        rejectUrl,
      }),
    });

    if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
          body: `${patient.name} invited you to monitor their medicines on MediSaathi. Accept here: ${acceptUrl}`,
          to: phone,
          from: process.env.TWILIO_PHONE_NUMBER
        });
      } catch (smsError) {
        console.error('Failed to send SMS invite:', smsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent! The caregiver will receive an email shortly.',
      inviteId: invite._id,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[caregiver/invite POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ── GET — list invitations ─────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const currentUser = await User.findById(userPayload.id).select('email');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Invites sent BY this patient
    const sent = await CaregiverInvite.find({ patientId: userPayload.id })
      .sort({ createdAt: -1 })
      .lean();

    // Invites RECEIVED at this user's email (caregiver side)
    const received = await CaregiverInvite.find({
      caregiverEmail: currentUser.email,
      status: 'pending',
    })
      .populate('patientId', 'name email age')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ sent, received });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[caregiver/invite GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
