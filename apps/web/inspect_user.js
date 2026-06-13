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

  // 1. Inspect patient Sunita Devi
  const patient = await db.collection('users').findOne({ email: 'sunita@gmail.com' });
  console.log('Patient Sunita Devi:', JSON.stringify(patient, null, 2));

  // 2. Inspect escalations
  const escalations = await db.collection('escalations').find({}).toArray();
  console.log(`\nEscalations count: ${escalations.length}`);
  for (const e of escalations) {
    console.log(JSON.stringify(e, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
