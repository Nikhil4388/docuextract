import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import api, { setTokens, clearTokens } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setTokensAndFetch: (tokens: AuthTokens) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<AuthTokens>('/auth/login', { email, password });
      setTokens(res.data);
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

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const me = await api.get<User>('/users/me');
      set({ user: me.data, isAuthenticated: true });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  setTokensAndFetch: async (tokens: AuthTokens) => {
    setTokens(tokens);
    const me = await api.get<User>('/users/me');
    set({ user: me.data, isAuthenticated: true });
  },
}));
