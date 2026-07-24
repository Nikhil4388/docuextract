/**
 * Tests: effective_limit computation and limit gate logic
 *
 * Mirrors the logic in:
 *   - frontend/src/components/layout/AppLayout.tsx  (hitLimit, effectiveLimit)
 *   - frontend/src/pages/JobsPage.tsx               (hitLimit, hitFreeLimit)
 *   - frontend/src/pages/NewJobPage.tsx             (hitLimit)
 *
 * These tests verify that every tier combination produces the correct
 * effectiveLimit and hitLimit values, matching the backend's own rules.
 */

import { describe, it, expect } from 'vitest';
import type { User } from '../types';

// ── Mirror the frontend effective_limit computation ───────────────────────────

const FREE_LIMIT  = 2;
const PAID_LIMIT  = 20;

/**
 * Mirrors AppLayout.tsx:
 *   const effectiveLimit = user?.effective_limit ?? (isSubscribed ? paidLimit : freeLimit);
 *   const hitLimit = !isAdmin && jobsUsed >= effectiveLimit;
 */
function computeEffectiveLimit(user: Partial<User>): number {
  const isSubscribed = user.is_subscribed ?? false;
  return user.effective_limit ?? (isSubscribed ? PAID_LIMIT : FREE_LIMIT);
}

function computeHitLimit(user: Partial<User>): boolean {
  const isAdmin = user.is_admin ?? false;
  const jobsUsed = user.jobs_used ?? 0;
  const effectiveLimit = computeEffectiveLimit(user);
  return !isAdmin && jobsUsed >= effectiveLimit;
}

/**
 * Mirrors JobsPage.tsx:
 *   const hitFreeLimit = hitLimit && !isSubscribed && !user?.max_jobs_override;
 */
function computeHitFreeLimit(user: Partial<User>): boolean {
  const isSubscribed = user.is_subscribed ?? false;
  return computeHitLimit(user) && !isSubscribed && !user.max_jobs_override;
}

// ── effectiveLimit resolution ─────────────────────────────────────────────────

describe('effectiveLimit — server value wins', () => {

  it('uses effective_limit from server when present', () => {
    const user: Partial<User> = { effective_limit: 100, is_subscribed: false };
    expect(computeEffectiveLimit(user)).toBe(100);
  });

  it('falls back to free limit when no effective_limit and not subscribed', () => {
    const user: Partial<User> = { is_subscribed: false };
    expect(computeEffectiveLimit(user)).toBe(FREE_LIMIT);
  });

  it('falls back to paid limit when no effective_limit and subscribed', () => {
    const user: Partial<User> = { is_subscribed: true };
    expect(computeEffectiveLimit(user)).toBe(PAID_LIMIT);
  });

  it('server effective_limit=0 is respected (not overridden by fallback)', () => {
    // effective_limit: 0 is falsy — the ?? operator returns the fallback for falsy values.
    // This is a known edge case: override=0 → server sends effective_limit=0, but
    // frontend ?? fallback treats 0 as falsy. Document this known behaviour.
    const user: Partial<User> = { effective_limit: 0 };
    // The ?? operator only falls back for null/undefined, NOT 0
    expect(computeEffectiveLimit(user)).toBe(0);
  });

  it('server effective_limit=999999 is used for admin', () => {
    const user: Partial<User> = { effective_limit: 999999, is_admin: true };
    expect(computeEffectiveLimit(user)).toBe(999999);
  });

  it('server effective_limit overrides is_subscribed-based fallback', () => {
    // subscribed user with override=50
    const user: Partial<User> = { effective_limit: 50, is_subscribed: true };
    expect(computeEffectiveLimit(user)).toBe(50);
  });
});

// ── hitLimit gate ─────────────────────────────────────────────────────────────

describe('hitLimit — free user', () => {

  it('free user at 0 jobs is NOT blocked', () => {
    const user: Partial<User> = { effective_limit: FREE_LIMIT, jobs_used: 0 };
    expect(computeHitLimit(user)).toBe(false);
  });

  it('free user at 1 job is NOT blocked', () => {
    const user: Partial<User> = { effective_limit: FREE_LIMIT, jobs_used: 1 };
    expect(computeHitLimit(user)).toBe(false);
  });

  it('free user at 2 jobs (limit) IS blocked', () => {
    const user: Partial<User> = { effective_limit: FREE_LIMIT, jobs_used: 2 };
    expect(computeHitLimit(user)).toBe(true);
  });

  it('free user over limit IS blocked', () => {
    const user: Partial<User> = { effective_limit: FREE_LIMIT, jobs_used: 5 };
    expect(computeHitLimit(user)).toBe(true);
  });
});

describe('hitLimit — subscribed user', () => {

  it('subscribed user at 2 jobs is NOT blocked (paid limit = 20)', () => {
    const user: Partial<User> = {
      effective_limit: PAID_LIMIT,
      is_subscribed: true,
      jobs_used: 2,
    };
    expect(computeHitLimit(user)).toBe(false);
  });

  it('subscribed user at 19 jobs is NOT blocked', () => {
    const user: Partial<User> = {
      effective_limit: PAID_LIMIT,
      is_subscribed: true,
      jobs_used: 19,
    };
    expect(computeHitLimit(user)).toBe(false);
  });

  it('subscribed user at 20 jobs (limit) IS blocked', () => {
    const user: Partial<User> = {
      effective_limit: PAID_LIMIT,
      is_subscribed: true,
      jobs_used: 20,
    };
    expect(computeHitLimit(user)).toBe(true);
  });
});

describe('hitLimit — override user', () => {

  it('override=100 at 5 jobs is NOT blocked', () => {
    const user: Partial<User> = {
      effective_limit: 100,
      max_jobs_override: 100,
      jobs_used: 5,
    };
    expect(computeHitLimit(user)).toBe(false);
  });

  it('override=100 at 100 jobs IS blocked', () => {
    const user: Partial<User> = {
      effective_limit: 100,
      max_jobs_override: 100,
      jobs_used: 100,
    };
    expect(computeHitLimit(user)).toBe(true);
  });

  it('override user at free-tier job count is NOT blocked (uses override, not free_limit)', () => {
    // Previously broken: this user would show "Limit reached" incorrectly
    const user: Partial<User> = {
      effective_limit: 100,
      max_jobs_override: 100,
      jobs_used: 2,
    };
    expect(computeHitLimit(user)).toBe(false);
  });
});

describe('hitLimit — admin user', () => {

  it('admin is NEVER blocked regardless of jobs_used', () => {
    const user: Partial<User> = {
      effective_limit: 999999,
      is_admin: true,
      jobs_used: 999999,
    };
    expect(computeHitLimit(user)).toBe(false);
  });

  it('admin with jobs_used=0 is not blocked', () => {
    const user: Partial<User> = {
      effective_limit: 999999,
      is_admin: true,
      jobs_used: 0,
    };
    expect(computeHitLimit(user)).toBe(false);
  });
});

// ── hitFreeLimit (donate paywall) ─────────────────────────────────────────────

describe('hitFreeLimit — paywall visibility', () => {

  it('free user at limit shows free limit paywall', () => {
    const user: Partial<User> = {
      effective_limit: FREE_LIMIT,
      is_subscribed: false,
      jobs_used: FREE_LIMIT,
    };
    expect(computeHitFreeLimit(user)).toBe(true);
  });

  it('subscribed user at paid limit does NOT show free limit paywall', () => {
    const user: Partial<User> = {
      effective_limit: PAID_LIMIT,
      is_subscribed: true,
      jobs_used: PAID_LIMIT,
    };
    expect(computeHitFreeLimit(user)).toBe(false);
  });

  it('override user at override limit does NOT show free limit paywall', () => {
    const user: Partial<User> = {
      effective_limit: 100,
      max_jobs_override: 100,
      is_subscribed: false,
      jobs_used: 100,
    };
    expect(computeHitFreeLimit(user)).toBe(false);
  });

  it('free user under limit does NOT show paywall', () => {
    const user: Partial<User> = {
      effective_limit: FREE_LIMIT,
      is_subscribed: false,
      jobs_used: 1,
    };
    expect(computeHitFreeLimit(user)).toBe(false);
  });
});

// ── jobs left counter ─────────────────────────────────────────────────────────

describe('jobsLeft counter', () => {

  function jobsLeft(user: Partial<User>): number {
    const effectiveLimit = computeEffectiveLimit(user);
    return Math.max(0, effectiveLimit - (user.jobs_used ?? 0));
  }

  it('free user 0/2 → 2 jobs left', () => {
    expect(jobsLeft({ effective_limit: 2, jobs_used: 0 })).toBe(2);
  });

  it('free user 1/2 → 1 job left', () => {
    expect(jobsLeft({ effective_limit: 2, jobs_used: 1 })).toBe(1);
  });

  it('free user 2/2 → 0 jobs left', () => {
    expect(jobsLeft({ effective_limit: 2, jobs_used: 2 })).toBe(0);
  });

  it('override user 5/100 → 95 jobs left', () => {
    expect(jobsLeft({ effective_limit: 100, jobs_used: 5 })).toBe(95);
  });

  it('never goes negative even if jobs_used > effective_limit', () => {
    expect(jobsLeft({ effective_limit: 2, jobs_used: 10 })).toBe(0);
  });

  it('admin 9999/999999 → large positive number', () => {
    expect(jobsLeft({ effective_limit: 999999, jobs_used: 9999, is_admin: true })).toBe(990000);
  });
});

// ── edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {

  it('undefined user fields are handled gracefully', () => {
    const user: Partial<User> = {};
    expect(() => computeEffectiveLimit(user)).not.toThrow();
    expect(() => computeHitLimit(user)).not.toThrow();
  });

  it('null max_jobs_override does not trigger override path', () => {
    const user: Partial<User> = {
      effective_limit: FREE_LIMIT,
      max_jobs_override: null,
      jobs_used: 2,
    };
    // hitFreeLimit should be true — no override in play
    expect(computeHitFreeLimit(user)).toBe(true);
  });
});
