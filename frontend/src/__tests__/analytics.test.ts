/**
 * Tests: src/utils/analytics.ts
 *
 * Covers:
 *   - trackPageView sends correct event_type and page
 *   - trackClick sends correct event_type, element, and page
 *   - trackConversion sends correct event_type and element
 *   - session_id is included in every payload
 *   - session_id is stable within a test (same value on repeated calls)
 *   - sendBeacon is preferred when available
 *   - fetch fallback used when sendBeacon is absent
 *   - Never throws even if sendBeacon throws
 *   - Never throws even if fetch throws
 *   - metadata is forwarded correctly
 *   - optional fields (page, metadata) absent when not provided
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackPageView, trackClick, trackConversion } from '../utils/analytics';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Decode a Blob to a parsed JSON object. */
async function blobToJson(blob: Blob): Promise<Record<string, unknown>> {
  const text = await blob.text();
  return JSON.parse(text);
}

/** Reset the module's private _sessionId between tests by re-importing. */
function resetSessionId() {
  // We can't access the private _sessionId, but we can force a new import.
  // Instead, just verify stability within a single test run.
}

// ── sendBeacon tests ──────────────────────────────────────────────────────────

describe('analytics — sendBeacon path', () => {
  let beaconCalls: Array<{ url: string; blob: Blob }> = [];
  let origSendBeacon: typeof navigator.sendBeacon;

  beforeEach(() => {
    beaconCalls = [];
    origSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = vi.fn((url: string, blob: unknown) => {
      beaconCalls.push({ url: url as string, blob: blob as Blob });
      return true;
    });
  });

  afterEach(() => {
    navigator.sendBeacon = origSendBeacon;
    vi.restoreAllMocks();
  });

  it('trackPageView calls sendBeacon once', () => {
    trackPageView('dashboard');
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('trackPageView sends event_type=page_view', async () => {
    trackPageView('dashboard');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.event_type).toBe('page_view');
  });

  it('trackPageView sends correct page', async () => {
    trackPageView('jobs');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.page).toBe('jobs');
  });

  it('trackClick sends event_type=click', async () => {
    trackClick('cta_button', 'landing');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.event_type).toBe('click');
  });

  it('trackClick sends element', async () => {
    trackClick('download_btn', 'jobs');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.element).toBe('download_btn');
  });

  it('trackClick sends page when provided', async () => {
    trackClick('btn', 'templates');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.page).toBe('templates');
  });

  it('trackConversion sends event_type=conversion', async () => {
    trackConversion('new_job_btn', 'dashboard');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.event_type).toBe('conversion');
  });

  it('trackConversion sends element', async () => {
    trackConversion('upgrade_banner');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.element).toBe('upgrade_banner');
  });

  it('payload includes session_id', async () => {
    trackPageView('admin');
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(typeof payload.session_id).toBe('string');
    expect((payload.session_id as string).length).toBeGreaterThan(0);
  });

  it('session_id is stable across calls within same module instance', async () => {
    trackPageView('page1');
    trackPageView('page2');
    const payload1 = await blobToJson(beaconCalls[0].blob);
    const payload2 = await blobToJson(beaconCalls[1].blob);
    expect(payload1.session_id).toBe(payload2.session_id);
  });

  it('metadata is forwarded in payload', async () => {
    trackPageView('landing', { source: 'google', ref: 'home' });
    const payload = await blobToJson(beaconCalls[0].blob);
    expect(payload.metadata).toEqual({ source: 'google', ref: 'home' });
  });

  it('undefined metadata is not included when omitted', async () => {
    trackPageView('landing');
    const payload = await blobToJson(beaconCalls[0].blob);
    // metadata key may be absent or undefined — either is acceptable
    expect(payload.metadata == null || payload.metadata === undefined).toBe(true);
  });

  it('blob content-type is application/json', () => {
    trackPageView('x');
    expect(beaconCalls[0].blob.type).toBe('application/json');
  });

  it('sends to correct URL', () => {
    trackPageView('x');
    expect(beaconCalls[0].url).toContain('/analytics/track');
  });

  it('does NOT throw even if sendBeacon throws', () => {
    navigator.sendBeacon = vi.fn(() => { throw new Error('sendBeacon failed'); });
    expect(() => trackPageView('x')).not.toThrow();
  });
});

// ── fetch fallback tests ──────────────────────────────────────────────────────

describe('analytics — fetch fallback path', () => {
  let fetchCalls: Array<[string, RequestInit]> = [];
  let origSendBeacon: typeof navigator.sendBeacon;
  let origFetch: typeof globalThis.fetch;

  beforeEach(() => {
    fetchCalls = [];
    // Remove sendBeacon to force fetch fallback
    origSendBeacon = navigator.sendBeacon;
    (navigator as Record<string, unknown>).sendBeacon = undefined;

    origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((url: string, init: RequestInit) => {
      fetchCalls.push([url, init]);
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as typeof fetch;
  });

  afterEach(() => {
    navigator.sendBeacon = origSendBeacon;
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('calls fetch when sendBeacon is absent', () => {
    trackPageView('dashboard');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('fetch uses POST method', () => {
    trackPageView('x');
    expect(fetchCalls[0][1].method).toBe('POST');
  });

  it('fetch sends JSON content-type', () => {
    trackPageView('x');
    const headers = fetchCalls[0][1].headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('fetch body contains correct event_type', () => {
    trackClick('btn', 'page');
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(body.event_type).toBe('click');
  });

  it('fetch body contains session_id', () => {
    trackPageView('x');
    const body = JSON.parse(fetchCalls[0][1].body as string);
    expect(typeof body.session_id).toBe('string');
  });

  it('does NOT throw even if fetch rejects', () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network error'))) as typeof fetch;
    expect(() => trackPageView('x')).not.toThrow();
  });

  it('uses keepalive: true', () => {
    trackPageView('x');
    expect(fetchCalls[0][1].keepalive).toBe(true);
  });

  it('uses credentials: omit', () => {
    trackPageView('x');
    expect(fetchCalls[0][1].credentials).toBe('omit');
  });
});

// ── never-throw guarantee ─────────────────────────────────────────────────────

describe('analytics — never throws', () => {
  it('trackPageView never throws', () => {
    expect(() => trackPageView('x')).not.toThrow();
  });

  it('trackClick never throws', () => {
    expect(() => trackClick('btn')).not.toThrow();
  });

  it('trackConversion never throws', () => {
    expect(() => trackConversion('elem')).not.toThrow();
  });
});
