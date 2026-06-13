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

  // Let's find the patient Sunita Devi
  const patient = await db.collection('users').findOne({ email: 'sunita@gmail.com' });
  if (!patient) {
    console.log('Patient Sunita Devi not found in database.');
  } else {
    console.log('\n==================================================');
    console.log('TEST PATIENT INFORMATION:');
    console.log(`ID: ${patient._id}`);
    console.log(`Name: ${patient.name}`);
    console.log(`Email: ${patient.email}`);
    console.log(`Role: ${patient.role}`);
    console.log(`Phone: ${patient.phone || 'Not specified'}`);
    console.log('==================================================');

    const caregiverLinks = patient.caregiverLinks || [];
    console.log(`Linked Caregivers (${caregiverLinks.length}):`);
    
    if (caregiverLinks.length === 0) {
      console.log('  No caregivers linked to this patient yet.');
    } else {
      for (const link of caregiverLinks) {
        const cgId = link.userId;
        const cgUser = await db.collection('users').findOne({ _id: cgId });
        console.log(`  - Caregiver ID: ${cgId}`);
        console.log(`    Name in Link: ${link.name || 'N/A'}`);
        console.log(`    Actual Name: ${cgUser ? cgUser.name : 'Not Found'}`);
        console.log(`    Email: ${link.email || (cgUser ? cgUser.email : 'N/A')}`);
        console.log(`    Relationship: ${link.relationship}`);
        console.log(`    Active Status: ${link.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`    Permissions: ${JSON.stringify(link.permissions)}`);
        console.log('  ------------------------------------------------');
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
