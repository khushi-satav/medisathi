
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No API key');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Create a 1x1 red pixel image in base64
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const prompt = `You are an expert medical prescription reader specializing in Indian prescriptions.
Look at this prescription image carefully and extract ALL medications.

Return ONLY valid JSON (no markdown, no extra text):
{
  "doctor": { "name": "", "registration": "", "hospital": "" },
  "patient": { "name": "", "age": "", "date": "" },
  "medicines": [
    {
      "name": "medicine name",
      "genericName": "generic name if visible",
      "dosage": "500mg",
      "form": "tablet",
      "frequency": "twice daily",
      "times": ["08:00", "20:00"],
      "foodInstruction": "after_meal",
      "duration": "30 days",
      "specialInstructions": "",
      "quantity": 60
    }
  ],
  "confidence": 0.92,
  "warnings": []
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: 'image/png' } }
    ]);
    
    console.log("Raw response:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
