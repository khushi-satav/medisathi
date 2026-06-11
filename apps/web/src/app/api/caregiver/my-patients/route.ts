import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import DoseLog from '@/models/DoseLog';
import AdherenceStats from '@/models/AdherenceStats';

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    const patients = await User.find({
      'caregiverLinks.userId': userPayload.id,
      'caregiverLinks.isActive': true
    }).select('-passwordHash');

    const enriched = await Promise.all(patients.map(async (p) => {
      const today = new Date().toISOString().split('T')[0];
      const stats = await AdherenceStats.findOne({ userId: p._id, date: today });
      const todayDoses = await DoseLog.find({ userId: p._id, scheduledDate: today })
        .populate('medicationId', 'name dosage color');
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoString = weekAgo.toISOString().split('T')[0];

      const weekStats = await AdherenceStats.find({
        userId: p._id,
        date: { $gte: weekAgoString }
      });

      const weekAvg = weekStats.length
        ? Math.round(weekStats.reduce((s, d) => s + d.adherenceRate, 0) / weekStats.length)
        : 0;

      return {
        ...p.toObject(),
        todayAdherence: stats?.adherenceRate || 0,
        weeklyAvg: weekAvg,
        riskLevel: weekAvg > 85 ? 'low' : weekAvg > 65 ? 'medium' : 'high',
        todayDoses,
        lastActive: p.updatedAt
      };
    }));

    return NextResponse.json({ patients: enriched });
  } catch (error: any) {
    console.error('[caregiver/my-patients GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
