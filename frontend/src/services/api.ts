import axios from 'axios';

const rawUrl = (import.meta as any).env?.VITE_API_URL || '';
const cleanUrl = rawUrl.replace(/\/+$/, '');

const API_BASE_URL = cleanUrl
  ? cleanUrl.endsWith('/api/v1')
    ? cleanUrl
    : `${cleanUrl}/api/v1`
  : '/api/v1';


export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Intercept requests to add Authorization Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cv_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle token expiration & refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.error?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('cv_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          if (res.data?.success) {
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            localStorage.setItem('cv_access_token', accessToken);
            localStorage.setItem('cv_refresh_token', newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('cv_access_token');
          localStorage.removeItem('cv_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
