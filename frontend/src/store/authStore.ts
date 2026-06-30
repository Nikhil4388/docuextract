import { create } from 'zustand';
import { User } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  // kept for OAuth callback compatibility — now just calls fetchMe
  setTokensAndFetch: (_tokens: unknown) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  // Start unauthenticated — fetchMe() in App.tsx confirms the session via cookie
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      // Backend sets httpOnly cookies; no tokens returned in body
      await api.post('/auth/login', { email, password });
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
      await api.post('/auth/logout');
    } catch {
      // Even if the request fails, clear local state
    }
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

  // OAuth callback: cookies already set by backend redirect — just verify session
  setTokensAndFetch: async (_tokens) => {
    const me = await api.get<User>('/users/me');
    set({ user: me.data, isAuthenticated: true });
  },
}));
