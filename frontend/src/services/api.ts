import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * All requests include credentials (httpOnly cookies).
 * Tokens are NEVER stored in localStorage or accessible to JavaScript.
 */
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // send cookies on every request
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original?._retry) {
      // Don't retry the refresh endpoint itself — that would loop
      if (original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve: () => resolve(api(original!)), reject });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Backend reads refresh_token cookie automatically; sets new access_token cookie
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original!);
      } catch (err) {
        processQueue(err);
        // Refresh failed — session expired, go to login
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

// Keep these as no-ops so import sites don't break during migration
export function setTokens(_: unknown) {}
export function clearTokens() {}
