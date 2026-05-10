import axios from 'axios';
import { useAppStore } from '@/store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      useAppStore.getState().setToken(null);
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export const apiClient = {
  auth: {
    login: (data: { email: string; password: string }) => api.post('/api/auth/login', data).then((r) => r.data),
    refresh: () => api.post('/api/auth/refresh').then((r) => r.data),
  },
  resume: {
    upload: (formData: FormData) => api.post('/api/resume/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
    get: (id: string) => api.get(`/api/resume/${id}`).then((r) => r.data),
    optimize: (id: string, jobDescription: string) => api.post(`/api/resume/${id}/optimize`, { jobDescription }).then((r) => r.data),
    download: (id: string) => api.get(`/api/resume/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
  },
  jobs: {
    list: (params?: { page?: number; limit?: number; keyword?: string }) => api.get('/api/jobs', { params }).then((r) => r.data),
    get: (id: string) => api.get(`/api/jobs/${id}`).then((r) => r.data),
  },
  interview: {
    start: (payload: { resume: any; jobDescription?: string; companyName?: string; focusSkills?: string[]; userId?: string }) => api.post('/api/interview/start', payload).then((r) => r.data),
    list: (params?: { page?: number; limit?: number; status?: string }) => api.get('/api/interview/history', { params }).then((r) => r.data),
    get: (id: string) => api.get(`/api/interview/${id}`).then((r) => r.data),
    getReport: (id: string) => api.get(`/api/interview/${id}/report`).then((r) => r.data),
    delete: (id: string) => api.delete(`/api/interview/${id}`).then((r) => r.data),
  },
};
