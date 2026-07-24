/**
 * Tests: src/utils/analytics.ts
 *
 * The tracker uses fetch(keepalive: true) — NOT sendBeacon — because:
 *  1. sendBeacon cannot set an Authorization header (events would be anonymous,
 *     last_seen_at would never update).
 *  2. sendBeacon + application/json Blob is silently blocked cross-origin
 *     (no CORS preflight support).
 *
 * Covers:
 *   - trackPageView / trackClick / trackConversion payloads
 *   - Authorization header attached when a token exists
 *   - No Authorization header when logged out
 *   - session_id present and stable
 *   - keepalive + credentials settings
 *   - Never throws even if fetch rejects or throws synchronously
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the api module BEFORE importing analytics
const mockGetAccessToken = vi.fn<() => string | null>(() => null);
vi.mock('../services/api', () => ({
  getAccessToken: () => mockGetAccessToken(),
}));

import { trackPageView, trackClick, trackConversion } from '../utils/analytics';

describe('analytics — fetch transport', () => {
  let fetchCalls: Array<[string, RequestInit]> = [];
  let origFetch: typeof globalThis.fetch;

  beforeEach(() => {
    fetchCalls = [];
    mockGetAccessToken.mockReturnValue(null);
    origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push([String(url), init ?? {}]);
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  // ── payloads ────────────────────────────────────────────────────────────────

  it('trackPageView sends event_type=page_view with page', () => {
    trackPageView('dashboard');
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(body.event_type).toBe('page_view');
    expect(body.page).toBe('dashboard');
  });

  it('trackClick sends event_type=click with element and page', () => {
    trackClick('cta_button', 'landing');
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(body.event_type).toBe('click');
    expect(body.element).toBe('cta_button');
    expect(body.page).toBe('landing');
  });

  it('trackConversion sends event_type=conversion with element', () => {
    trackConversion('new_job_btn', 'dashboard');
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(body.event_type).toBe('conversion');
    expect(body.element).toBe('new_job_btn');
  });

  it('metadata is forwarded', () => {
    trackPageView('landing', { source: 'google' });
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(body.metadata).toEqual({ source: 'google' });
  });

  it('sends to /analytics/track endpoint', () => {
    trackPageView('x');
    expect(fetchCalls[0][0]).toContain('/analytics/track');
  });

  // ── session id ──────────────────────────────────────────────────────────────

  it('payload includes a non-empty session_id', () => {
    trackPageView('x');
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(typeof body.session_id).toBe('string');
    expect(body.session_id.length).toBeGreaterThan(0);
  });

  it('session_id is stable across calls', () => {
    trackPageView('a');
    trackPageView('b');
    const b1 = JSON.parse(fetchCalls[0][1].body as string);
    const b2 = JSON.parse(fetchCalls[1][1].body as string);
    expect(b1.session_id).toBe(b2.session_id);
  });

  // ── auth header ─────────────────────────────────────────────────────────────

  it('attaches Authorization header when a token exists', () => {
    mockGetAccessToken.mockReturnValue('test-jwt-token');
    trackPageView('dashboard');
    const headers = fetchCalls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('omits Authorization header when logged out', () => {
    mockGetAccessToken.mockReturnValue(null);
    trackPageView('landing');
    const headers = fetchCalls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('always sends Content-Type: application/json', () => {
    trackPageView('x');
    const headers = fetchCalls[0][1].headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  // ── transport settings ─────────────────────────────────────────────────────

  it('uses POST', () => {
    trackPageView('x');
    expect(fetchCalls[0][1].method).toBe('POST');
  });

  it('uses keepalive: true (survives page unload)', () => {
    trackPageView('x');
    expect(fetchCalls[0][1].keepalive).toBe(true);
  });

  it('uses credentials: omit', () => {
    trackPageView('x');
    expect(fetchCalls[0][1].credentials).toBe('omit');
  });

  // ── never-throw guarantee ──────────────────────────────────────────────────

  it('does NOT throw when fetch rejects', () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as typeof fetch;
    expect(() => trackPageView('x')).not.toThrow();
  });

  it('does NOT throw when fetch throws synchronously', () => {
    globalThis.fetch = vi.fn(() => { throw new Error('boom'); }) as typeof fetch;
    expect(() => trackPageView('x')).not.toThrow();
  });

  it('does NOT throw when getAccessToken throws', () => {
    mockGetAccessToken.mockImplementation(() => { throw new Error('store broken'); });
    expect(() => trackPageView('x')).not.toThrow();
  });

  it('trackClick never throws', () => {
    expect(() => trackClick('btn')).not.toThrow();
  });

  it('trackConversion never throws', () => {
    expect(() => trackConversion('elem')).not.toThrow();
  });
});
