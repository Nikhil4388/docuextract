import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthTokens } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setTokens(tokens: AuthTokens) {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

const api: AxiosInstance = axios.create({ baseURL: BASE_URL });

// Attach token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original?._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original!.headers!.Authorization = `Bearer ${token}`;
          return api(original!);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        const tokens: AuthTokens = res.data;
        setTokens(tokens);
        processQueue(null, tokens.access_token);
        original!.headers!.Authorization = `Bearer ${tokens.access_token}`;
        return api(original!);
      } catch (err) {
        processQueue(err, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
