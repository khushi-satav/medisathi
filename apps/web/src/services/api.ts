import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
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

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
};

// ─── Medications ─────────────────────────────────────────────────────────────
export const medicationsService = {
  getAll: (activeOnly = true) => api.get(`/medications?active=${activeOnly}`),
  create: (data: any) => api.post('/medications', data),
  update: (id: string, data: any) => api.put(`/medications/${id}`, data),
  delete: (id: string) => api.delete(`/medications/${id}`),
};

// ─── Dose Logs ───────────────────────────────────────────────────────────────
export const doseLogsService = {
  getToday: (date?: string) => api.get(`/dose-logs/today${date ? `?date=${date}` : ''}`),
  getHistory: (params: { startDate?: string; endDate?: string; medicationId?: string }) =>
    api.get('/dose-logs', { params }),
  log: (data: { medicationId: string; status: string; scheduledTime: string; skipReason?: string }) =>
    api.post('/dose-logs', data),
};

// ─── Prescriptions ───────────────────────────────────────────────────────────
export const prescriptionsService = {
  getAll: () => api.get('/prescriptions'),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/prescriptions/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  addMedications: (prescriptionId: string, selectedMedicines?: any[]) =>
    api.post('/prescriptions/add-medications', { prescriptionId, selectedMedicines }),
};

// ─── Insights ────────────────────────────────────────────────────────────────
export const insightsService = {
  getStats: (days = 30) => api.get(`/insights?days=${days}`),
};

// ─── AI ──────────────────────────────────────────────────────────────────────
export const aiService = {
  ask: (question: string) => api.post('/ai/ask', { question }),
};

export default api;
