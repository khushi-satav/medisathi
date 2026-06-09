/**
 * GET /api/caregiver/invite/respond?token=xxx&action=accept|reject
 * ─────────────────────────────────────────────────────────────────
 * Validates the invite token, then either:
 *   - accept: links caregiver ↔ patient bidirectionally
 *   - reject: marks the invite rejected
 *
 * Works even if the caregiver has no account yet; in that case we
 * redirect them to /register?inviteToken=xxx so they can sign up.
 *
 * POST /api/caregiver/invite/respond
 * ─────────────────────────────────────────────────────────────────
 * Same logic but called from authenticated session (after registration).
 * Body: { token: string, action: 'accept' | 'reject' }
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import CaregiverInvite from '@/models/CaregiverInvite';

const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function handleResponse(token: string, action: 'accept' | 'reject') {
  await connectDB();

  const invite = await CaregiverInvite.findOne({ token });
  if (!invite) {
    return { error: 'Invalid or expired invitation link.', status: 404 };
  }
  if (invite.status !== 'pending') {
    return { error: `This invitation has already been ${invite.status}.`, status: 409 };
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    await CaregiverInvite.updateOne({ _id: invite._id }, { status: 'expired' });
    return { error: 'This invitation link has expired.', status: 410 };
  }

  if (action === 'reject') {
    invite.status = 'rejected';
    await invite.save();
    return { message: 'Invitation declined. You can close this window.' };
  }

  // --- ACCEPT ---
  // Check if caregiver has an account
  const caregiverUser = await User.findOne({ email: invite.caregiverEmail });

  if (!caregiverUser) {
    // Return signal so UI/redirect can send them to register with inviteToken
    return {
      requiresRegistration: true,
      inviteToken: token,
      redirectUrl: `${appUrl}/register?inviteToken=${token}`,
    };
  }

  // Bi-directional link: add to patient's caregiverLinks
  await User.updateOne(
    { _id: invite.patientId, 'caregiverLinks.userId': { $ne: caregiverUser._id } },
    {
      $push: {
        caregiverLinks: {
          userId: caregiverUser._id,
          relationship: invite.relationship,
          permissions: invite.permissions,
          isActive: true,
          addedAt: new Date(),
        },
      },
    }
  );

  // Add to caregiver's patientLinks
  await User.updateOne(
    { _id: caregiverUser._id, 'caregiverLinks.userId': { $ne: invite.patientId } },
    {
      $push: {
        caregiverLinks: {
          userId: invite.patientId,
          relationship: invite.relationship,
          permissions: invite.permissions,
          isActive: true,
          addedAt: new Date(),
        },
      },
    }
  );

  // Mark invite accepted
  invite.status = 'accepted';
  invite.caregiverId = caregiverUser._id;
  invite.acceptedAt = new Date();
  await invite.save();

  return {
    message: 'You are now connected as a caregiver. Welcome to MediSaathi!',
    redirectUrl: `${appUrl}/dashboard`,
  };
}

/* ── GET (email link click) ─────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') ?? '';
  const action = (searchParams.get('action') ?? 'accept') as 'accept' | 'reject';

  try {
    const result = await handleResponse(token, action);

    if (result.error) {
      return NextResponse.redirect(
        `${appUrl}/invite/error?message=${encodeURIComponent(result.error)}`
      );
    }
    if (result.requiresRegistration) {
      return NextResponse.redirect(result.redirectUrl!);
    }
    return NextResponse.redirect(
      `${appUrl}/invite/success?message=${encodeURIComponent(result.message!)}`
    );
  } catch (err: any) {
    console.error('[invite/respond GET]', err);
    return NextResponse.redirect(
      `${appUrl}/invite/error?message=${encodeURIComponent('Something went wrong. Please try again.')}`
    );
  }
}

/* ── POST (called from auth-gated page after registration/login) ────── */
export async function POST(req: NextRequest) {
  try {
    const { token, action } = await req.json() as { token: string; action: 'accept' | 'reject' };

    if (!token || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'token and action are required' }, { status: 400 });
    }

    const result = await handleResponse(token, action);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[invite/respond POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
