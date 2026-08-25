/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`,
});

api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access');
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    // Don't retry auth endpoints (login/refresh/logout/google-exchange) to avoid loops
    const isAuthEndpoint =
      originalRequest?.url?.includes('token/') ||
      originalRequest?.url?.includes('logout/') ||
      originalRequest?.url?.includes('auth/auth0');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('refresh');
        const refreshUrl = API_BASE.endsWith('/')
          ? `${API_BASE}token/refresh/`
          : `${API_BASE}/token/refresh/`;
        const res = await axios.post(refreshUrl, { refresh });
        localStorage.setItem('access', res.data.access);
        window.dispatchEvent(new Event("auth-change"));
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.dispatchEvent(new Event("auth-change"));
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;