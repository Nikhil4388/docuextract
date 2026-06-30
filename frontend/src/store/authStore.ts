import { create } from 'zustand';
import { User } from '../types';
import api, { setAccessToken, clearAccessToken } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  // Called by OAuth callback — receives the one-time exchange code from URL
  setTokensAndFetch: (code: string | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      // Backend returns access_token in body + sets refresh_token httpOnly cookie
      const res = await api.post<{ access_token: string }>('/auth/login', { email, password });
      setAccessToken(res.data.access_token);
      const me = await api.get<User>('/users/me');
      set({ user: me.data, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      await api.post('/auth/register', { email, password, full_name: fullName });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');  // clears refresh cookie server-side
    } catch { /* ignore */ }
    clearAccessToken();
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    // If no access token in memory, the 401 interceptor in api.ts will automatically
    // call /auth/refresh (using the httpOnly cookie) to get one, then retry this.
    try {
      const me = await api.get<User>('/users/me');
      set({ user: me.data, isAuthenticated: true });
    } catch {
      clearAccessToken();
      set({ user: null, isAuthenticated: false });
    }
  },

  setTokensAndFetch: async (code: string | null) => {
    if (code) {
      // Exchange the one-time OAuth code for an access token + refresh cookie
      const res = await api.post<{ access_token: string }>('/auth/exchange', { code });
      setAccessToken(res.data.access_token);
    }
    const me = await api.get<User>('/users/me');
    set({ user: me.data, isAuthenticated: true });
  },
}));
