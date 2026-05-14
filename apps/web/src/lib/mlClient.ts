/**
 * ML API Client
 * =============
 * Utility for Next.js API routes to call the FastAPI ML microservice.
 * Falls back gracefully if the ML service is unavailable.
 */

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

export interface AdherenceRiskInput {
  userId: string;
  age?: number;
  missed_doses_last_7d?: number;
  frequency?: number;
  has_chronic_condition?: boolean;
  adherence_streak?: number;
  hour_of_day?: number;
  is_weekend?: boolean;
  num_medications?: number;
  days_since_start?: number;
  stock_days_remaining?: number;
  medicationId?: string;
}

export interface AdherenceRiskResult {
  missRisk: number;
  riskLevel: string;
  riskFactors: string[];
  recommendation: string;
  confidence: number;
  modelVersion: string;
  usedTrainedModel: boolean;
}

/**
 * Predict adherence risk for a patient by calling the ML microservice.
 * Returns null if the ML service is unreachable (caller should handle gracefully).
 */
export async function predictAdherenceRisk(
  input: AdherenceRiskInput
): Promise<AdherenceRiskResult | null> {
  try {
    const res = await fetch(`${ML_API_URL}/api/v1/predict/adherence-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      console.error(`ML API returned ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.warn('ML API unavailable, skipping prediction:', (error as Error).message);
    return null;
  }
}

/**
 * Log a dose event to the ML service for future retraining.
 */
export async function logDoseToML(data: {
  userId: string;
  medicationId: string;
  status: string;
  scheduledTime: string;
  hour: number;
  dayOfWeek: number;
}): Promise<void> {
  try {
    await fetch(`${ML_API_URL}/api/v1/log-dose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-critical — don't break the main flow
  }
}

/**
 * Scan a prescription image using the ML API's PaddleOCR pipeline.
 * Returns extracted medicines or null if the ML service is unreachable.
 */
export async function scanPrescription(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{
  success: boolean;
  raw_text: string[];
  medicines: any[];
  total_lines?: number;
  total_medicines?: number;
  message?: string;
} | null> {
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    const res = await fetch(`${ML_API_URL}/scan-prescription`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000), // 30s timeout for OCR
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`ML API scan returned ${res.status}: ${errText}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.warn('ML API OCR unavailable:', (error as Error).message);
    return null;
  }
}

/**
 * Check if the ML service is healthy and models are loaded.
 */
export async function checkMLHealth(): Promise<{ healthy: boolean; modelsReady: boolean; version?: string }> {
  try {
    const res = await fetch(`${ML_API_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { healthy: false, modelsReady: false };
    const data = await res.json();
    return { healthy: true, modelsReady: data.modelsReady, version: data.modelVersion };
  } catch {
    return { healthy: false, modelsReady: false };
  }
}
