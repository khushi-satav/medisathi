/**
 * Standalone SMS test script — run this BEFORE wiring into the app.
 *
 * Usage:
 *   node test-sms.js +91XXXXXXXXXX
 *   node test-sms.js               (uses TEST_PHONE from env if set)
 *
 * Prerequisites:
 *   1. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER set in .env.local
 *   2. For trial accounts: the recipient number must be a Verified Caller ID
 *      in the Twilio Console → https://console.twilio.com/us1/develop/phone-numbers/manage/verified
 *   3. For Indian (+91) numbers: TRAI DLT registration required (see README)
 */

require('dotenv').config({ path: '.env.local' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromPhone  = process.env.TWILIO_PHONE_NUMBER;

// ── Validate env ────────────────────────────────────────────────────────────
const missing = [];
if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
if (!authToken)  missing.push('TWILIO_AUTH_TOKEN');
if (!fromPhone)  missing.push('TWILIO_PHONE_NUMBER');

if (missing.length > 0) {
  console.error('\n❌  Missing environment variables:', missing.join(', '));
  console.error('    Add them to apps/web/.env.local and re-run.\n');
  process.exit(1);
}

// ── Validate recipient ──────────────────────────────────────────────────────
const toPhone = process.argv[2] || process.env.TEST_PHONE;
if (!toPhone) {
  console.error('\n❌  No recipient phone number provided.');
  console.error('    Usage: node test-sms.js +91XXXXXXXXXX\n');
  process.exit(1);
}

// Basic E.164 sanity check
if (!/^\+\d{7,15}$/.test(toPhone)) {
  console.error(`\n❌  "${toPhone}" doesn't look like E.164 format (e.g. +919876543210).\n`);
  process.exit(1);
}

// ── Send ────────────────────────────────────────────────────────────────────
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

console.log(`\n📱 Sending test SMS from ${fromPhone} → ${toPhone} ...`);

client.messages
  .create({
    body: '✅ This is a test alert from MediSaathi. Your SMS notifications are working correctly.',
    from: fromPhone,
    to: toPhone,
  })
  .then((message) => {
    console.log(`\n✅  Success! Message SID: ${message.sid}`);
    console.log(`    Status: ${message.status}`);
    console.log('\n    The test SMS has been dispatched. Check the recipient phone.\n');
    console.log(
      '⚠️   INDIA DLT NOTE: If sending to an Indian (+91) number and the message was\n' +
      '    not received despite a successful SID, TRAI DLT registration is required.\n' +
      '    See: https://console.twilio.com/us1/develop/sms/regulatory-compliance\n'
    );
  })
  .catch((err) => {
    console.error(`\n❌  Twilio error [${err.code}]: ${err.message}`);

    if (err.code === 21608) {
      console.error('\n    → Trial account: the recipient number is not a Verified Caller ID.');
      console.error('    → Add it here: https://console.twilio.com/us1/develop/phone-numbers/manage/verified\n');
    } else if (err.code === 21211 || err.code === 21217) {
      console.error('\n    → The phone number format may be invalid. Use E.164: +919876543210\n');
    } else if (err.code === 21606) {
      console.error('\n    → The "From" number is not SMS-capable. Check TWILIO_PHONE_NUMBER.\n');
    }

    process.exit(1);
  });
