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
    model: 'gemini-2.5-flash',
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
CRITICAL RULES:

1. TIMES — Map frequency EXACTLY to correct time slots:
   - "once daily" / "OD" / "1-0-0" → ["09:00"]
   - "twice daily" / "BD" / "BID" / "1-0-1" → ["08:00", "20:00"]
   - "thrice daily" / "TDS" / "TID" / "1-1-1" / "three times" → ["08:00", "14:00", "20:00"]
   - "four times" / "QID" / "1-1-1-1" / "every 6 hours" → ["06:00", "12:00", "18:00", "00:00"]
   - "every 8 hours" → ["06:00", "14:00", "22:00"]
   - "every 12 hours" → ["08:00", "20:00"]
   - "every 4 hours" → ["06:00", "10:00", "14:00", "18:00", "22:00"]
   - "at night" / "HS" / "bedtime" / "at bedtime" → ["21:00"]
   - "in the morning" / "morning" → ["08:00"]
   - "before breakfast" → ["07:30"]
   - "after breakfast" → ["09:00"]
   - "afternoon" / "noon" → ["13:00"]
   - "evening" → ["18:00"]
   - "SOS" / "as needed" / "PRN" → ["09:00"]

2. FOOD INSTRUCTION — Map EXACTLY to one of these values only:
   - "after food" / "after meal" / "after eating" / "after meals" / "PC" → "after_meal"
   - "before food" / "before meal" / "before eating" / "before breakfast" / "AC" / "empty stomach" → "before_meal"
   - "with food" / "with meal" / "with water" → "with_meal"
   - "empty stomach" / "fasting" → "empty_stomach"
   - "any time" / "anytime" / not specified → "any_time"

3. FORM — Map to one of: tablet | capsule | syrup | injection | drops | cream | ointment | powder | inhaler | gel | suspension | liquid

4. QUANTITY — Calculate automatically:
   - quantity = (number of times per day) x (duration in days)
   - Example: "twice daily for 5 days" → quantity = 2 x 5 = 10
   - If duration not mentioned, assume 30 days
   - For liquid/syrup, quantity = total ml

5. SPELLING — Auto-correct common medicine name errors (e.g. "Azithrmycin" → "Azithromycin")

6. COMPLETENESS — Extract EVERY medicine listed. Do not skip any.

7. SPECIAL PATTERNS to handle:
   - "1-0-1" = morning + evening (twice daily)
   - "1-1-1" = three times daily  
   - "0-0-1" = only at night
   - "1-0-0" = only morning
   - "for fever/body pain" → specialInstructions field
   - "if required" / "SOS" → note in specialInstructions`;

  const text = await analyzeImage(base64Image, mimeType, prompt);
  console.log('--- GEMINI RAW RESPONSE ---');
  console.log(text);
  console.log('---------------------------');

  // Extract JSON safely — handle markdown code blocks too
  let cleaned = text.trim();
  // Remove ```json ... ``` wrapping if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON match found in Gemini text');
    throw new Error('Gemini did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Post-process: ensure times array is always present and valid
  if (parsed.medicines) {
    parsed.medicines = parsed.medicines.map((med: any) => {
      // If times is empty or missing, derive from frequency
      if (!med.times || med.times.length === 0) {
        med.times = mapFrequencyToTimesLocal(med.frequency);
      }
      // Ensure foodInstruction is valid enum
      const validFood = ['after_meal', 'before_meal', 'with_meal', 'empty_stomach', 'any_time'];
      if (!validFood.includes(med.foodInstruction)) {
        med.foodInstruction = 'any_time';
      }
      // Auto-calculate quantity if missing or 0
      if (!med.quantity || med.quantity === 0) {
        const durationDays = parseDurationDays(med.duration);
        med.quantity = med.times.length * durationDays;
      }
      return med;
    });
  }

  console.log('--- PARSED JSON ---');
  console.log(parsed);
  return parsed;
}
