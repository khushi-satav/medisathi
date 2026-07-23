// One-time data migration for the pre-fix "undetermined form silently
// became 'tablet'" bug. See src/lib/medicationFormMigration.ts for the full
// explanation of what this does and why.
//
// SAFE BY DEFAULT: dry run unless you pass --apply. Always run without
// --apply first and read the output before applying.
//
//   npx tsx scripts/migrate-medication-forms.ts            # dry run (default)
//   npx tsx scripts/migrate-medication-forms.ts --apply     # writes changes
//
// Requires MONGODB_URI to be set (reads apps/web/.env.local, same as the app).

import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const apply = process.argv.includes('--apply');

  const connectDB = (await import('../src/lib/mongoose')).default;
  const Medication = (await import('../src/models/Medication')).default;
  const Prescription = (await import('../src/models/Prescription')).default;
  const { buildFormMigrationPlan, applyFormMigrationPlan, summarizePlan } = await import(
    '../src/lib/medicationFormMigration'
  );

  await connectDB();

  const totalTablet = await Medication.countDocuments({ form: 'tablet' });
  const scanSourcedTablet = await Medication.countDocuments({ form: 'tablet', addedByOCR: true });
  const manualTablet = totalTablet - scanSourcedTablet;

  console.log(`Medications with form:'tablet': ${totalTablet}`);
  console.log(`  scan-sourced (addedByOCR:true): ${scanSourcedTablet}`);
  console.log(`  manually entered: ${manualTablet}`);

  const plan = await buildFormMigrationPlan({ Medication, Prescription });
  const summary = summarizePlan(plan);

  console.log('\nPlan summary:');
  console.log(`  recover        (raw form recovered — form + escalationLevel corrected): ${summary.recover}`);
  console.log(`  flag_no_source (no raw source — downgraded to reminder_only + flagged for review): ${summary.flag_no_source}`);
  console.log(`  confirm_correct(raw form confirms tablet — no change): ${summary.confirm_correct}`);
  console.log(`  skip_manual    (manual entry, no source to check — not touched): ${summary.skip_manual}`);

  if (plan.length > 0) {
    console.log('\nDetail:');
    for (const item of plan) {
      console.log(`  [${item.action}] ${item.name} (${item.medicationId}) — ${item.reason}`);
    }
  }

  if (!apply) {
    console.log('\nDRY RUN — no changes written. Re-run with --apply to write these changes.');
    process.exit(0);
  }

  const applied = await applyFormMigrationPlan(Medication, plan);
  console.log(`\nAPPLIED — ${applied} document(s) updated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
