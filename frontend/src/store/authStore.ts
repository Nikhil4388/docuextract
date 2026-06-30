import { create } from 'zustand';
import { User } from '../types';
import api, { setAccessToken, setRefreshToken, clearAllTokens, getRefreshToken } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;   // true while we're checking for a stored session on load
  initAuth: () => Promise<void>;
  setInitialized: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setTokensAndFetch: (tokens: { access_token: string; refresh_token: string } | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isInitializing: true,    // assume we may have a stored session until proven otherwise

  /** Mark init as done (called by AuthInit on /auth/callback where we skip initAuth) */
  setInitialized: () => set({ isInitializing: false }),

  /** Called on app mount. Restores session from stored refresh token. */
  initAuth: async () => {
    const storedRefresh = getRefreshToken();
    if (!storedRefresh) {
      set({ isInitializing: false });
      return;
    }
    try {
      const res = await api.post<{ access_token: string; refresh_token?: string }>(
        '/auth/refresh',
        { refresh_token: storedRefresh }
      );
      setAccessToken(res.data.access_token);
      if (res.data.refresh_token) setRefreshToken(res.data.refresh_token);
      const me = await api.get<User>('/users/me');
      set({ user: me.data, isAuthenticated: true, isInitializing: false });
    } catch {
      clearAllTokens();
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ access_token: string; refresh_token: string }>(
        '/auth/login', { email, password }
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

  setTokensAndFetch: async (tokens) => {
    if (!tokens?.access_token || !tokens?.refresh_token) {
      throw new Error('Missing tokens');
    }
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    const me = await api.get<User>('/users/me');
    set({ user: me.data, isAuthenticated: true, isInitializing: false });
  },
}));
