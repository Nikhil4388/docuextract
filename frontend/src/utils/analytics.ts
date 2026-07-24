/**
 * Lightweight analytics tracking.
 * Sends fire-and-forget events to /api/v1/analytics/track.
 * Never throws — analytics must never break the app.
 *
 * NOTE: We use fetch(keepalive: true) instead of navigator.sendBeacon because:
 *  1. sendBeacon cannot set an Authorization header, so events would always
 *     be anonymous and last_seen_at would never update.
 *  2. sendBeacon with an application/json Blob to a cross-origin API is
 *     silently blocked by the browser (it cannot perform a CORS preflight).
 * fetch with keepalive:true survives page unload just like sendBeacon.
 */
import { getAccessToken } from '../services/api';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1');

// Stable session ID for the browser tab (reset on hard refresh)
let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return _sessionId;
}

interface TrackPayload {
  event_type: string;
  page?: string;
  element?: string;
  metadata?: Record<string, unknown>;
}

function send(payload: TrackPayload): void {
  const body = JSON.stringify({ ...payload, session_id: getSessionId() });
  const url = `${BASE_URL}/analytics/track`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    // keepalive:true lets the request finish even if the page unloads,
    // giving us sendBeacon semantics WITH auth headers and proper CORS.
    fetch(url, {
      method: 'POST',
      headers,
      body,
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never propagate
  }
}

export function trackPageView(page: string, metadata?: Record<string, unknown>): void {
  send({ event_type: 'page_view', page, metadata });
}

export function trackClick(element: string, page?: string, metadata?: Record<string, unknown>): void {
  send({ event_type: 'click', element, page, metadata });
}

export function trackConversion(element: string, page?: string): void {
  send({ event_type: 'conversion', element, page });
}
