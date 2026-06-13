/**
 * GET /api/search?q=metformin
 * Searches across:
 *  1. User's active medications
 *  2. App pages / features (static)
 *  3. FDA/medicine master (if Medicine collection exists)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import mongoose from 'mongoose';

// ─── Static page index ────────────────────────────────────────────────────────
const ALL_PAGES = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: '🏠',
    description: "Today's medications and adherence overview",
  },
  {
    title: 'Medications',
    path: '/medications',
    icon: '💊',
    description: 'Manage your medicine list, add or edit medicines',
  },
  {
    title: 'Dose Tracker',
    path: '/dose-tracker',
    icon: '📅',
    description: 'Daily dose tracker, mark taken or missed doses',
  },
  {
    title: 'History',
    path: '/history',
    icon: '📋',
    description: 'View full dose history and past adherence',
  },
  {
    title: 'Scan Prescription',
    path: '/scan-rx',
    icon: '📷',
    description: 'OCR scan your prescription to auto-add medicines',
  },
  {
    title: 'AI Insights',
    path: '/insights',
    icon: '🤖',
    description: 'Adherence analytics, predictions, and recommendations',
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: '⚙️',
    description: 'Notifications, privacy, profile preferences',
  },
  {
    title: 'Notification Settings',
    path: '/settings?tab=notifications',
    icon: '🔔',
    description: 'Configure medication reminders and alerts',
  },
  {
    title: 'Caregiver Portal',
    path: '/caregiver',
    icon: '👥',
    description: 'Monitor patients or manage your caregivers',
  },
  {
    title: 'Messages',
    path: '/messages',
    icon: '💬',
    description: 'Chat with caregivers and healthcare providers',
  },
];

// ─── Quick actions (shown when no specific page matched) ─────────────────────
const QUICK_ACTIONS = [
  {
    title: 'Add Medication',
    path: '/medications?add=true',
    icon: '➕',
    description: 'Add a new medicine to your list',
  },
  {
    title: 'Log Dose',
    path: '/dose-tracker',
    icon: '✅',
    description: "Mark today's dose as taken",
  },
];

// ─── Compute next dose time from time strings ─────────────────────────────────
function getNextDoseDisplay(times: string[]): string {
  if (!times || times.length === 0) return 'Not scheduled';
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const t of times) {
    const [h, m] = t.split(':').map(Number);
    if (h * 60 + m > nowMins) return t;
  }
  return times[0] + ' (tomorrow)';
}

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (q.length < 2) {
      return NextResponse.json({ medications: [], pages: [], medicineInfo: null });
    }

    const regex = new RegExp(q, 'i');

    // ── 1. Search user's active medications ──────────────────────────────────
    const medications = await Medication.find({
      userId: new mongoose.Types.ObjectId(userPayload.id),
      isActive: true,
      $or: [{ name: regex }, { condition: regex }, { dosage: regex }, { genericName: regex }],
    })
      .limit(5)
      .lean();

    const medsWithMeta = medications.map((med) => ({
      ...med,
      nextDose: getNextDoseDisplay(med.times),
    }));

    // ── 2. Static pages search ───────────────────────────────────────────────
    const pages = [...ALL_PAGES, ...QUICK_ACTIONS].filter(
      (p) => regex.test(p.title) || regex.test(p.description)
    );

    // ── 3. Medicine master DB (if collection exists) ─────────────────────────
    let medicineInfo = null;
    try {
      const MedicineModel =
        mongoose.models.Medicine ||
        mongoose.model(
          'Medicine',
          new mongoose.Schema({
            name: String,
            genericName: String,
            brandNames: [String],
            drugClass: String,
            indications: String,
            description: String,
            sideEffects: [String],
            interactions: [String],
          })
        );

      medicineInfo = await MedicineModel.findOne({
        $or: [
          { name: regex },
          { genericName: regex },
          { brandNames: { $elemMatch: { $regex: q, $options: 'i' } } },
        ],
      })
        .select('name genericName drugClass indications sideEffects interactions description')
        .lean();
    } catch {
      // Medicine master DB not seeded — skip silently
    }

    return NextResponse.json({
      medications: medsWithMeta,
      pages,
      medicineInfo,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[search GET]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
