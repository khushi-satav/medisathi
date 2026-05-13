import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');
  return new GoogleGenerativeAI(apiKey);
};

// ─── Text-only generation ───────────────────────────────────────────────────
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemInstruction || 'You are MediSaathi, a caring AI medication assistant for Indian patients. Be concise, clear, and supportive.',
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Vision (image + text) generation ──────────────────────────────────────
export async function analyzeImage(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const imagePart: Part = {
    inlineData: { data: base64Image, mimeType },
  };

  const result = await model.generateContent([prompt, imagePart]);
  return result.response.text();
}

// ─── OCR + Parse prescription image ────────────────────────────────────────
export async function extractPrescription(base64Image: string, mimeType: string) {
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
}

Rules:
- Correct medicine name spelling errors
- foodInstruction must be one of: after_meal | before_meal | with_meal | empty_stomach | any_time
- Infer times from frequency: once=["08:00"], twice=["08:00","20:00"], thrice=["08:00","14:00","20:00"]
- "1-0-1" notation = morning + evening = ["08:00","20:00"]
- If field not visible, use empty string`;

  const text = await analyzeImage(base64Image, mimeType, prompt);

  // Extract JSON safely
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON');

  return JSON.parse(jsonMatch[0]);
}
