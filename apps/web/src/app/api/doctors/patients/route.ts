import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import AdherenceStats from '@/models/AdherenceStats';

export async function GET(req: NextRequest) {
  try {
    const userPayload = requireAuth(req);
    await connectDB();

    if (userPayload.role !== 'doctor' && userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Must be a doctor.' }, { status: 403 });
    }

    const doctorId = userPayload.id;

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: any = {
      role: 'patient',
    };

    if (includeInactive) {
      query.doctorLinks = {
        $elemMatch: {
          doctorId: doctorId
        }
      };
    } else {
      query.doctorLinks = {
        $elemMatch: {
          doctorId: doctorId,
          isActive: true
        }
      };
    }

    const patients = await User.find(query)
      .select('name email phone age gender conditions doctorNotes profilePhoto doctorLinks')
      .lean();

    // Fetch today's adherence stats and streak info for each patient
    const todayStr = new Date().toISOString().split('T')[0];
    
    const enhancedPatients = await Promise.all(
      patients.map(async (p: any) => {
        const stats = await AdherenceStats.findOne({
          userId: p._id,
          date: todayStr,
        }).lean();

        // Compute streak from recent AdherenceStats
        const recentStats = await AdherenceStats.find({ userId: p._id })
          .sort({ date: -1 })
          .limit(10)
          .lean();

        let streak = 0;
        for (const stat of recentStats) {
          if (stat.adherenceRate >= 80) {
            streak++;
          } else {
            break;
          }
        }

        // Filter notes by this doctor
        const notes = (p.doctorNotes || [])
          .filter((n: any) => n.doctorId.toString() === doctorId.toString())
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const doctorLink = (p.doctorLinks || []).find(
          (link: any) => link.doctorId.toString() === doctorId.toString()
        );
        const isActive = doctorLink ? doctorLink.isActive : false;

        const todayAdherence = stats ? stats.adherenceRate : 100;
        const missedToday = stats ? stats.missedDoses : 0;
        const riskLevel = todayAdherence >= 80 ? 'low' : todayAdherence >= 50 ? 'medium' : 'high';

        return {
          ...p,
          todayAdherence,
          missedToday,
          streak,
          riskLevel,
          notes,
          isActive,
        };
      })
    );

    return NextResponse.json({ success: true, patients: enhancedPatients });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/doctors/patients] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
