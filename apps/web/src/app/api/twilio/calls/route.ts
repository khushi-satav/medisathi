import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import twilio from 'twilio';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    requireAuth(req);

    const { searchParams } = new URL(req.url);
    const sid = searchParams.get('sid');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

    // Helper: Connect to DB and get user mappings to match phone numbers
    let userMappings: Record<string, { name: string; type: string }> = {};
    try {
      await connectDB();
      const users = await User.find({}).lean();
      users.forEach((u: any) => {
        if (u.phone) {
          userMappings[u.phone.replace(/\s+/g, '')] = { name: u.name, type: u.role };
        }
        if (u.emergencyContacts) {
          u.emergencyContacts.forEach((contact: any) => {
            if (contact.phone) {
              userMappings[contact.phone.replace(/\s+/g, '')] = {
                name: `${contact.name} (Contact for ${u.name})`,
                type: 'caregiver',
              };
            }
          });
        }
      });
    } catch (dbErr) {
      console.error('Error fetching users for phone mappings:', dbErr);
    }

    const cleanPhone = (phone: string) => phone ? phone.replace(/\s+/g, '') : '';
    const lookupName = (phone: string) => {
      const cleaned = cleanPhone(phone);
      if (userMappings[cleaned]) {
        return userMappings[cleaned].name;
      }
      // Try fuzzy match (e.g. without country code)
      const lastNineDigits = cleaned.slice(-9);
      if (lastNineDigits) {
        for (const key of Object.keys(userMappings)) {
          if (key.endsWith(lastNineDigits)) {
            return userMappings[key].name;
          }
        }
      }
      return 'Unknown Recipient';
    };

    // If twilio credentials are not available, return mock data for demonstration
    if (!accountSid || !authToken) {
      console.warn("Twilio credentials missing. Returning simulated call log data.");
      
      const mockCalls = [
        {
          sid: 'CA994d52e50529d846e4b85779c4a01234',
          to: '+919876543210',
          from: twilioPhone,
          status: 'completed',
          duration: '34',
          direction: 'outbound-api',
          dateCreated: new Date(Date.now() - 5 * 60000).toISOString(), // 5m ago
          price: '0.013',
          patientName: lookupName('+919876543210') || 'Ramesh Patel',
          simulated: true,
          recordings: [
            {
              sid: 'REa0520cfdb1203487f7a1f5be67049876',
              duration: '30',
              dateCreated: new Date(Date.now() - 5 * 60000).toISOString(),
              mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // public demo audio
            }
          ]
        },
        {
          sid: 'CA825d19e90924d846e4b85779c4a05678',
          to: '+919999999999',
          from: twilioPhone,
          status: 'completed',
          duration: '45',
          direction: 'outbound-api',
          dateCreated: new Date(Date.now() - 15 * 60000).toISOString(), // 15m ago
          price: '0.015',
          patientName: lookupName('+919999999999') || 'Priya Patel (Caregiver)',
          simulated: true,
          recordings: [
            {
              sid: 'REb0921cfdb1203487f7a1f5be67049999',
              duration: '42',
              dateCreated: new Date(Date.now() - 15 * 60000).toISOString(),
              mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
            }
          ]
        },
        {
          sid: 'CA521f72e90924d846e4b85779c4a09101',
          to: '+918888888888',
          from: twilioPhone,
          status: 'no-answer',
          duration: '0',
          direction: 'outbound-api',
          dateCreated: new Date(Date.now() - 30 * 60000).toISOString(), // 30m ago
          price: '0.000',
          patientName: lookupName('+918888888888') || 'Amit Sharma (Caregiver 2)',
          simulated: true,
          recordings: []
        }
      ];

      if (sid) {
        const selected = mockCalls.find(c => c.sid === sid);
        if (!selected) {
          return NextResponse.json({ error: 'Simulated call details not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, call: selected });
      }

      return NextResponse.json({ success: true, calls: mockCalls, isMock: true });
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    if (sid) {
      // Fetch details of a specific call
      const call = await client.calls(sid).fetch();
      
      // Fetch recordings for this call
      const recordings = await client.recordings.list({ callSid: sid });
      const enrichedRecordings = recordings.map((rec) => {
        // Construct the audio media URL for streaming/playback
        const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${rec.sid}.mp3`;
        return {
          sid: rec.sid,
          duration: rec.duration,
          dateCreated: rec.dateCreated,
          mediaUrl
        };
      });

      return NextResponse.json({
        success: true,
        call: {
          sid: call.sid,
          to: call.to,
          from: call.from,
          status: call.status,
          duration: call.duration,
          direction: call.direction,
          dateCreated: call.dateCreated,
          price: call.price,
          patientName: lookupName(call.to),
          recordings: enrichedRecordings
        }
      });
    } else {
      // List call logs
      const calls = await client.calls.list({ limit });
      
      const enrichedCalls = await Promise.all(
        calls.map(async (call) => {
          return {
            sid: call.sid,
            to: call.to,
            from: call.from,
            status: call.status,
            duration: call.duration,
            direction: call.direction,
            dateCreated: call.dateCreated,
            price: call.price,
            patientName: lookupName(call.to),
          };
        })
      );

      return NextResponse.json({
        success: true,
        calls: enrichedCalls,
        isMock: false
      });
    }

  } catch (error: any) {
    console.error('Error interacting with Twilio Calls API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
