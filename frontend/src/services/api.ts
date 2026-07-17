import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * Token storage strategy:
 *  - access_token  → JS module variable (memory only). Never in localStorage.
 *                    Invisible in DevTools Application tab. Lost on hard refresh
 *                    but auto-restored via /auth/refresh below.
 *  - refresh_token → localStorage. Used only to silently restore the access
 *                    token on page reload. If stolen, attacker can only get a
 *                    new access token — still gated by the backend.
 */
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) { _accessToken = token; }
export function getAccessToken() { return _accessToken; }

export function setRefreshToken(token: string) {
  localStorage.setItem('refresh_token', token);
}
export function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}
export function clearAllTokens() {
  _accessToken = null;
  localStorage.removeItem('refresh_token');
}

// Legacy no-ops — keep so old import sites don't break
export function setTokens(_: unknown) {}
export function clearTokens() {}

const api: AxiosInstance = axios.create({ baseURL: BASE_URL });

// Attach in-memory access token on every request
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// On 401 — try to silently refresh, then replay the original request
let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function flushQueue(err: unknown, token: string | null) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  queue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const orig = error.config as typeof error.config & { _retry?: boolean };
    const path = orig?.url ?? '';

    // Never retry the refresh or login endpoints — would loop forever
    if (
      error.response?.status !== 401 ||
      orig?._retry ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/login') ||
      path.includes('/auth/exchange')
    ) {
      return Promise.reject(error);
    }

    const storedRefresh = getRefreshToken();
    if (!storedRefresh) {
      // No refresh token — signal session expired (React Router will redirect, no hard reload)
      if (!window.location.pathname.includes('/auth/callback')) {
        clearAllTokens();
        window.dispatchEvent(new Event('auth:sessionExpired'));
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (t) => { orig!.headers!.Authorization = `Bearer ${t}`; resolve(api(orig!)); },
          reject,
        });
      });
    }

    orig._retry = true;
    isRefreshing = true;

    try {
      const res = await api.post<{ access_token: string; refresh_token?: string }>(
        '/auth/refresh',
        { refresh_token: storedRefresh }
      );
      const { access_token, refresh_token } = res.data;
      setAccessToken(access_token);
      if (refresh_token) setRefreshToken(refresh_token);
      flushQueue(null, access_token);
      orig!.headers!.Authorization = `Bearer ${access_token}`;
      return api(orig!);
    } catch (err) {
      flushQueue(err, null);
      clearAllTokens();
      if (!window.location.pathname.includes('/auth/callback')) {
        // Dispatch event so App.tsx handles redirect via React Router (no hard reload)
        window.dispatchEvent(new Event('auth:sessionExpired'));
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
