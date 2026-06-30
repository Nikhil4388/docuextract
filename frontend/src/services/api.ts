import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * Access token lives in JS memory only — not localStorage, not a cookie.
 * Invisible to DevTools. Lost on hard refresh, but restored automatically
 * via the /auth/refresh endpoint which uses an httpOnly refresh cookie.
 */
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) { _accessToken = token; }
export function getAccessToken() { return _accessToken; }
export function clearAccessToken() { _accessToken = null; }

// Keep these no-ops so any remaining import sites don't break
export function setTokens(_: unknown) {}
export function clearTokens() {}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,  // needed so the httpOnly refresh cookie is sent to /auth/refresh
});

// Attach in-memory access token as Authorization header
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// On 401: silently refresh the access token via the httpOnly refresh cookie, then retry
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // Don't retry refresh/login/exchange endpoints (avoids infinite loops)
    const url = original?.url ?? '';
    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !url.includes('/auth/refresh') &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/exchange')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original!.headers!.Authorization = `Bearer ${token}`;
              resolve(api(original!));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Refresh cookie is httpOnly — browser sends it automatically
        const res = await api.post<{ access_token: string }>('/auth/refresh');
        const newToken = res.data.access_token;
        setAccessToken(newToken);
        processQueue(null, newToken);
        original!.headers!.Authorization = `Bearer ${newToken}`;
        return api(original!);
      } catch (err) {
        processQueue(err, null);
        clearAccessToken();
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
