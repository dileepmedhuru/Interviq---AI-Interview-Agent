/* ── api.js ── typed API calls for every backend endpoint ────────────────── */
import { api } from './utils.js';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    register:       (body)  => api.post('/auth/register', body),
    login:          (body)  => api.post('/auth/login', body),
    logout:         ()      => api.post('/auth/logout'),
    refresh:        ()      => api.post('/auth/refresh'),
    me:             ()      => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword:  (body)  => api.post('/auth/reset-password', body),
    verifyEmail:    (token) => api.get(`/auth/verify/${token}`),
};

// ── User ──────────────────────────────────────────────────────────────────────
export const userApi = {
    getProfile:     ()      => api.get('/user/profile'),
    updateProfile:  (body)  => api.put('/user/profile', body),
    changePassword: (body)  => api.put('/user/password', body),
    getStats:       ()      => api.get('/user/stats'),
};

// ── Resume ────────────────────────────────────────────────────────────────────
export const resumeApi = {
    uploadText: (text) => api.post('/resume/upload', { text }),

    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('resume', file);
        const token = sessionStorage.getItem('accessToken');
        const res = await fetch('/api/resume/upload', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');
        return data;
    },

    getActive: () => api.get('/resume/active'),
};

// ── Interview ─────────────────────────────────────────────────────────────────
export const interviewApi = {
    setup:    (body)  => api.post('/interview/setup', body),
    answer:   (id, body) => api.post(`/interview/${id}/answer`, body),
    evaluate: (id)    => api.post(`/interview/${id}/evaluate`),
    get:      (id)    => api.get(`/interview/${id}`),
    history:  (page = 1, limit = 10) => api.get(`/interview/history?page=${page}&limit=${limit}`),
};