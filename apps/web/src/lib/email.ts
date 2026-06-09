/**
 * Email Utility
 * =============
 * Sends transactional email via Resend API.
 * Falls back to console logging in dev when RESEND_API_KEY is not set.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  // --- Resend (production) ---
  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MediSaathi <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Resend error: ${JSON.stringify(err)}`);
    }
    return;
  }

  // --- Dev fallback: print to console ---
  console.log('\n========== [EMAIL SENT - DEV MODE] ==========');
  console.log(`TO:      ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log('HTML preview (truncated):');
  console.log(html.slice(0, 600));
  console.log('==============================================\n');
}

/* ── Template helpers ─────────────────────────────────────────────────── */

export function caregiverInviteEmailHtml({
  patientName,
  relationship,
  message,
  acceptUrl,
  rejectUrl,
}: {
  patientName: string;
  relationship: string;
  message?: string;
  acceptUrl: string;
  rejectUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MediSaathi — Caregiver Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6c63ff,#8b5cf6);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;margin-bottom:4px;">💊</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">MediSaathi</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Your health companion</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">You've been invited as a Caregiver 💙</h2>
            <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 20px;">
              <strong style="color:#1e293b;">${patientName}</strong> wants to add you as their
              <strong style="color:#6c63ff;">${relationship}</strong> on MediSaathi — a medication
              management platform that helps patients stay on track with their health routines.
            </p>
            ${message ? `
            <div style="background:#f8f9ff;border-left:4px solid #6c63ff;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
              <p style="color:#475569;font-size:14px;margin:0;font-style:italic;">"${message}"</p>
            </div>` : ''}
            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px;">
              As a caregiver, you will be able to:
            </p>
            <ul style="margin:0 0 28px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
              <li>View medication dose logs in real-time</li>
              <li>Receive alerts when doses are missed</li>
              <li>Monitor adherence trends and risk score</li>
            </ul>
            <!-- CTA Buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${acceptUrl}" style="display:block;background:linear-gradient(135deg,#6c63ff,#8b5cf6);color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;">
                    ✅ Accept Invitation
                  </a>
                </td>
                <td style="padding-left:8px;">
                  <a href="${rejectUrl}" style="display:block;background:#f1f5f9;color:#64748b;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;border:1px solid #e2e8f0;">
                    ❌ Decline
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;">
              This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">MediSaathi · Empowering health journeys</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}
