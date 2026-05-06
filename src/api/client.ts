import axios from 'axios';

export const apiClient = axios.create({ baseURL: '/api', timeout: 30000 });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = { login: (body: any) => apiClient.post('/auth/login', body).then((r) => r.data), refresh: () => apiClient.post('/auth/refresh').then((r) => r.data) };
export const resume = { upload: (data: FormData) => apiClient.post('/resume/upload', data).then((r) => r.data), get: (id: string) => apiClient.get(`/resume/${id}`).then((r) => r.data), optimize: (id: string, body: any) => apiClient.post(`/resume/${id}/optimize`, body).then((r) => r.data), download: (id: string) => apiClient.get(`/resume/${id}/download`) };
export const jobs = { list: () => apiClient.get('/jobs').then((r) => r.data), get: (id: string) => apiClient.get(`/jobs/${id}`).then((r) => r.data) };
export const interview = { list: () => apiClient.get('/interview/history').then((r) => r.data), get: (id: string) => apiClient.get(`/interview/${id}`).then((r) => r.data), getReport: (id: string) => apiClient.get(`/interview/${id}/report`).then((r) => r.data), delete: (id: string) => apiClient.delete(`/interview/${id}`).then((r) => r.data) };
