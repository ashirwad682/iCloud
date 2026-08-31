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
  withCredentials: true,
});

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanBase = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '') || '';
  if (url.startsWith('/')) {
    return cleanBase ? `${cleanBase}${url}` : url;
  }
  return cleanBase ? `${cleanBase}/${url}` : url;
}

// Intercept requests to add Authorization Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cv_access_token');
  if (token && config.headers) {
    if (typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (config.data instanceof FormData && config.headers) {
    if (typeof (config.headers as any).delete === 'function') {
      (config.headers as any).delete('Content-Type');
      (config.headers as any).delete('content-type');
    }
    delete (config.headers as any)['Content-Type'];
    delete (config.headers as any)['content-type'];
  }
  return config;
});

// Intercept responses to handle token expiration & refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('cv_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          if (res.data?.success) {
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            localStorage.setItem('cv_access_token', accessToken);
            localStorage.setItem('cv_refresh_token', newRefreshToken);
            if (typeof (originalRequest.headers as any)?.set === 'function') {
              (originalRequest.headers as any).set('Authorization', `Bearer ${accessToken}`);
            } else if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('cv_access_token');
          localStorage.removeItem('cv_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

