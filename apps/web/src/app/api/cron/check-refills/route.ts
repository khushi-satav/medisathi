export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Medication from '@/models/Medication';
import User from '@/models/User';
import { sendSMS } from '@/lib/notificationHelper';
import { getSmsTemplates } from '@/lib/smsTemplates';

/**
 * GET /api/cron/check-refills
 * Called daily by Vercel Cron or an external scheduler.
 * Optionally add a security token check:
 *   if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 */
export async function GET() {
  try {
    await connectDB();

    const medications = await Medication.find({ isActive: true }).populate('userId');

    let alertsSent = 0;
    let alertsFailed = 0;

    for (const med of medications) {
      if (!med.userId) continue;

      const user = await User.findById(med.userId);
      if (!user) continue;

      const daysRemaining =
        med.times.length > 0 ? Math.floor(med.stockCount / med.times.length) : 0;

      const alertThreshold = med.refillAlertDays || 7;

      if (daysRemaining <= alertThreshold) {
        const t = getSmsTemplates(user.language);

        // Send to patient
        if (user.phone) {
          const result = await sendSMS(
            user.phone,
            t.refillAlert(med.name, med.dosage, daysRemaining)
          );
          if (result.success) alertsSent++;
          else {
            alertsFailed++;
            console.error(`Refill alert failed for patient ${user.phone}: ${result.error}`);
          }
        }

        // Send to emergency contacts / caregivers
        if (user.emergencyContacts && user.emergencyContacts.length > 0) {
          for (const contact of user.emergencyContacts) {
            if (contact.phone) {
              const result = await sendSMS(
                contact.phone,
                t.caregiverRefillAlert(user.name, med.name, med.dosage, daysRemaining)
              );
              if (result.success) alertsSent++;
              else {
                alertsFailed++;
                console.error(`Refill alert failed for caregiver ${contact.phone}: ${result.error}`);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, alertsSent, alertsFailed });
  } catch (error: any) {
    console.error('[check-refills cron] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
