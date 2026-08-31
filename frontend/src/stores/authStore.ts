import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('cv_access_token'),
  isAuthenticated: !!localStorage.getItem('cv_access_token'),
  isLoading: !!localStorage.getItem('cv_access_token'),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('cv_access_token', accessToken);
    localStorage.setItem('cv_refresh_token', refreshToken);
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
    socketService.connect();
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('cv_access_token');
      localStorage.removeItem('cv_refresh_token');
      socketService.disconnect();
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      window.location.href = '/login';
    }
  },

  fetchMe: async () => {
    const token = localStorage.getItem('cv_access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
        socketService.connect();
      }
    } catch (err) {
      localStorage.removeItem('cv_access_token');
      localStorage.removeItem('cv_refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (data) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));
  },
}));
