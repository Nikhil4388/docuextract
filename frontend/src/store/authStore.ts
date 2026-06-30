import { create } from 'zustand';
import { User } from '../types';
import api, { setAccessToken, setRefreshToken, clearAllTokens, getRefreshToken } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  // OAuth callback: receives { access_token, refresh_token } from URL params
  setTokensAndFetch: (tokens: { access_token: string; refresh_token: string } | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  /** Called once on app mount. Restores session from localStorage refresh token. */
  initAuth: async () => {
    const storedRefresh = getRefreshToken();
    if (!storedRefresh) return; // nothing to restore
    try {
      const res = await api.post<{ access_token: string; refresh_token?: string }>(
        '/auth/refresh',
        { refresh_token: storedRefresh }
      );
      setAccessToken(res.data.access_token);
      if (res.data.refresh_token) setRefreshToken(res.data.refresh_token);
      const me = await api.get<User>('/users/me');
      set({ user: me.data, isAuthenticated: true });
    } catch {
      clearAllTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ access_token: string; refresh_token: string }>(
        '/auth/login',
        { email, password }
      );
      setAccessToken(res.data.access_token);
      setRefreshToken(res.data.refresh_token);
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
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAllTokens();
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const me = await api.get<User>('/users/me');
      set({ user: me.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  /** OAuth callback: tokens arrive in URL params from the backend redirect. */
  setTokensAndFetch: async (tokens) => {
    if (!tokens?.access_token || !tokens?.refresh_token) {
      throw new Error('Missing tokens in OAuth callback');
    }
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    const me = await api.get<User>('/users/me');
    set({ user: me.data, isAuthenticated: true });
  },
}));
