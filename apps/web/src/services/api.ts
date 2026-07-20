/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Attach JWT to every request ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Handle 401 globally (auto logout) ───────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
};

// ─── Medications ──────────────────────────────────────────────────────────────
export const medicationsService = {
  getAll: (activeOnly = true) => api.get(`/medications?active=${activeOnly}`),
  create: (data: any) => api.post('/medications', data),
  update: (id: string, data: any) => api.put(`/medications/${id}`, data),
  delete: (id: string) => api.delete(`/medications/${id}`),
};

// ─── Dose Logs ────────────────────────────────────────────────────────────────
export const doseLogsService = {
  getToday: (date?: string) =>
    api.get(`/dose-logs/today${date ? `?date=${date}` : ''}`),
  getHistory: (params: { startDate?: string; endDate?: string; medicationId?: string }) =>
    api.get('/dose-logs', { params }),
  log: (data: { medicationId: string; status: string; scheduledTime: string; skipReason?: string }) =>
    api.post('/dose-logs', data),
};

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const prescriptionsService = {
  getAll: () => api.get('/prescriptions'),

  // Upload image for OCR scan (Gemini Vision)
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/prescriptions/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
  },

  // Add medications from a scanned prescription
  addMedications: (prescriptionId: string, selectedMedicines?: any[]) =>
    api.post('/prescriptions/add-medications', { prescriptionId, selectedMedicines }),

  // Delete a scanned/uploaded prescription record
  delete: (id: string) => api.delete(`/prescriptions/${id}`),
};

// ─── Insights ─────────────────────────────────────────────────────────────────
export const insightsService = {
  getStats: (days = 30) => api.get(`/insights?days=${days}`),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiService = {
  // Ask a medication-related question
  ask: (question: string) => api.post('/ai/ask', { question }),

  // Get personalized daily medication briefing.
  // `locale` is sent in the body so the server can use the correct language
  // even when the DB write for a recent language switch hasn't landed yet.
  getDailyBriefing: (locale: string) => api.post('/ai/daily-briefing', { language: locale }),

  // Get adherence prediction risk (ML powered)
  predict: () => api.get('/ai/predict'),
};

// ─── Caregiver ────────────────────────────────────────────────────────────────
export const caregiverService = {
  getPatients: () => api.get('/caregiver/patients'),
};

// ─── Doctor ───────────────────────────────────────────────────────────────────
export const doctorService = {
  getPatients: (includeInactive = false) =>
    api.get(`/doctors/patients${includeInactive ? '?includeInactive=true' : ''}`),
  getPatientDetails: (patientId: string) => api.get(`/doctors/patients/${patientId}`),
  addNote: (patientId: string, note: string) => api.post('/doctors/notes', { patientId, note }),
  togglePatientStatus: (patientId: string, isActive: boolean) =>
    api.patch(`/doctors/patients/${patientId}`, { isActive }),
  
  // Patient-facing doctor link operations:
  getAllDoctors: () => api.get('/doctors'),
  linkDoctor: (doctorId: string) => api.post('/doctors/link', { doctorId }),
  toggleDoctorLink: (doctorId: string, isActive: boolean) =>
    api.patch('/doctors/link', { doctorId, isActive }),
  unlinkDoctor: (doctorId: string) => api.delete(`/doctors/link?doctorId=${doctorId}`),
};

// ─── ML Predictions ───────────────────────────────────────────────────────────
export const predictionsService = {
  // Get adherence risk prediction for a medication
  getRisk: (medicationId?: string) =>
    api.get(`/predictions${medicationId ? `?medicationId=${medicationId}` : ''}`),
};

// ─── SOS ──────────────────────────────────────────────────────────────────────
export const sosService = {
  triggerSOS: (location?: { latitude: number; longitude: number }) =>
    api.post('/sos', location),
};

export default api;
