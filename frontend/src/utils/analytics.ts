/**
 * Lightweight analytics tracking.
 * Sends fire-and-forget events to /api/v1/analytics/track.
 * Never throws — analytics must never break the app.
 */

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
  // Use sendBeacon when available (works even on page unload)
  const body = JSON.stringify({ ...payload, session_id: getSessionId() });
  const url = `${BASE_URL}/analytics/track`;

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      // Fallback: async fetch, fire-and-forget
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'omit',
        keepalive: true,
      }).catch(() => {});
    }
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
