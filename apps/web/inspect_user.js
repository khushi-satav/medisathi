const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');

async function run() {
  if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medisaathi';
  console.log(`Connecting to: ${uri}`);
  await mongoose.connect(uri, { dbName: 'medisaathi' });
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Inspect patient Anshul Vijayvargiya
  const patient = await db.collection('users').findOne({ email: 'anshulvijayvargiya4@gmail.com' });
  console.log('Patient Anshul Vijayvargiya:', JSON.stringify(patient, null, 2));

  if (patient) {
    const meds = await db.collection('medications').find({ userId: patient._id }).toArray();
    console.log('\n--- MEDICATIONS ---');
    console.log(JSON.stringify(meds, null, 2));

    const logs = await db.collection('doselogs').find({ userId: patient._id }).toArray();
    console.log('\n--- DOSE LOGS ---');
    console.log(JSON.stringify(logs, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
