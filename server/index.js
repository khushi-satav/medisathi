import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Mock database for missed doses
let alerts = [];

// Twilio Simulation Status
let callStatus = "idle"; // idle, calling, connected, failed

// 1. OCR Endpoint Simulation
app.post('/api/ocr/scan', (req, res) => {
  console.log('Scanning prescription...');
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        medications: [
          { name: "Metformin", dosage: "500mg", frequency: "2x daily" },
          { name: "Atorvastatin", dosage: "20mg", frequency: "1x daily" }
        ]
      }
    });
  }, 2000);
});

// 2. Twilio Call Escalation
app.post('/api/caregiver/call-escalation', (req, res) => {
  const { patientId, patientName } = req.body;
  console.log(`Initiating Twilio call for patient: ${patientName}`);
  
  callStatus = "calling";
  
  // Simulate Twilio API Lifecycle
  setTimeout(() => {
    callStatus = "connected";
    console.log(`Call connected to caregiver for ${patientName}`);
  }, 2000);

  setTimeout(() => {
    callStatus = "idle";
    console.log(`Call completed for ${patientName}`);
  }, 7000);

  res.json({ success: true, message: "Call initiated", callId: "CA" + Math.random().toString(36).substring(7) });
});

// 3. Call Status Polling
app.get('/api/caregiver/call-status', (req, res) => {
  res.json({ status: callStatus });
});

// 4. Background Missed Dose Logic (Simulated)
app.post('/api/medicines/missed-dose-alert', (req, res) => {
  const { patientId, medicineName, delayHours } = req.body;
  
  if (delayHours >= 1) {
    const alert = {
      id: Date.now(),
      patientId,
      message: `CRITICAL: ${medicineName} missed for ${delayHours} hour(s).`,
      timestamp: new Date(),
      status: 'pending_escalation'
    };
    alerts.push(alert);
    console.log(`[ALERT] ${alert.message}`);
    res.json({ success: true, alertTriggered: true, alert });
  } else {
    res.json({ success: true, alertTriggered: false });
  }
});

app.listen(port, () => {
  console.log(`MediSathi Backend listening at http://localhost:${port}`);
});
