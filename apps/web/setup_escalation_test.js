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

  // 1. Inspect caregiver Anil Kumar
  const caregiver = await db.collection('users').findOne({ email: 'anil@gmail.com' });
  if (!caregiver) {
    console.log('Caregiver not found');
  } else {
    console.log('Caregiver found:', {
      id: caregiver._id,
      name: caregiver.name,
      phone: caregiver.phone,
      fcmToken: caregiver.fcmToken
    });

    // Make sure caregiver has a phone number and a test fcmToken
    if (!caregiver.phone || !caregiver.fcmToken) {
      await db.collection('users').updateOne(
        { _id: caregiver._id },
        { 
          $set: { 
            phone: caregiver.phone || '+919876543210',
            fcmToken: caregiver.fcmToken || 'test-fcm-token-123'
          } 
        }
      );
      console.log('Updated caregiver phone & fcmToken.');
    }
  }

  // 2. Inspect patient Sunita Devi
  const patient = await db.collection('users').findOne({ email: 'sunita@gmail.com' });
  console.log('Patient found:', {
    id: patient._id,
    name: patient.name,
    timezone: patient.timezone
  });

  // 3. Inspect medications
  const medications = await db.collection('medications').find({ userId: patient._id }).toArray();
  console.log(`Medications found for patient (${medications.length}):`);
  for (const m of medications) {
    console.log(`- ID: ${m._id}, Name: ${m.name}, Times: ${m.times}, Active: ${m.isActive}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
