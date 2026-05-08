import axios from 'axios';

export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 15000 });
apiClient.interceptors.request.use((config) => { const token = localStorage.getItem('token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
apiClient.interceptors.response.use((r) => r, (e) => Promise.reject(e));
export const auth = { login: (data: any) => apiClient.post('/auth/login', data), refresh: () => apiClient.post('/auth/refresh') };
export const resume = { upload: (formData: FormData) => apiClient.post('/resume/upload', formData), get: (id: string) => apiClient.get(`/resume/${id}`), optimize: (id: string, jobDescription: string) => apiClient.post(`/resume/${id}/optimize`, { jobDescription }), download: (id: string) => apiClient.get(`/resume/${id}/download`, { responseType: 'blob' }) };
export const jobs = { list: (params?: any) => apiClient.get('/jobs', { params }), get: (id: string) => apiClient.get(`/jobs/${id}`) };
export const interview = { list: (params?: any) => apiClient.get('/interview/history', { params }), get: (id: string) => apiClient.get(`/interview/${id}`), getReport: (id: string) => apiClient.get(`/interview/${id}/report`), deleteInterview: (id: string) => apiClient.delete(`/interview/${id}`) };
