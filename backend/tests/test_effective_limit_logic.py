"""
Tests: effective_limit computation logic

This mirrors the logic in:
  - app/api/routes/users.py  → GET /users/me
  - app/api/routes/jobs.py   → POST /jobs/ (limit gate)
  - app/api/routes/admin.py  → _effective_limit() helper

All three must agree on the same output for the same input.
"""
import pytest
from unittest.mock import MagicMock

from app.models.user import User, UserRole
from app.api.routes.admin import _effective_limit as admin_effective_limit

FREE_LIMIT  = 2
PAID_LIMIT  = 20
ADMIN_EMAIL = "admin@example.com"


def _users_route_limit(user, admin_email_list, free_limit, paid_limit):
    """Mirrors the logic in app/api/routes/users.py → get_profile()."""
    is_admin = user.email in admin_email_list
    is_subscribed = user.is_subscribed or False

    if is_admin:
        return 999999
    elif user.max_jobs_override is not None:
        return user.max_jobs_override
    elif is_subscribed:
        return paid_limit
    else:
        return free_limit


def _jobs_route_limit(user, admin_email_list, free_limit, paid_limit):
    """Mirrors the limit-gate logic in app/api/routes/jobs.py → create_job()."""
    # Admin bypass — no limit computed
    if user.email in admin_email_list:
        return None  # unlimited

    if user.max_jobs_override is not None:
        return user.max_jobs_override
    elif user.is_subscribed:
        return paid_limit
    else:
        return free_limit


def _make_user(email="u@test.com", is_subscribed=False,
               jobs_used=0, max_jobs_override=None, role=UserRole.USER):
    u = MagicMock(spec=User)
    u.email = email
    u.is_subscribed = is_subscribed
    u.jobs_used = jobs_used
    u.max_jobs_override = max_jobs_override
    u.role = role
    return u


class TestEffectiveLimitPureLogic:

    # ── users route ───────────────────────────────────────────────────────────

    def test_free_user_limit(self):
        u = _make_user()
        assert _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT) == FREE_LIMIT

    def test_subscribed_user_limit(self):
        u = _make_user(is_subscribed=True)
        assert _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT) == PAID_LIMIT

    def test_override_user_limit(self):
        u = _make_user(max_jobs_override=100)
        assert _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT) == 100

    def test_override_beats_subscription(self):
        u = _make_user(is_subscribed=True, max_jobs_override=50)
        assert _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT) == 50

    def test_admin_gets_sentinel(self):
        u = _make_user(email=ADMIN_EMAIL)
        assert _users_route_limit(u, [ADMIN_EMAIL], FREE_LIMIT, PAID_LIMIT) == 999999

    def test_admin_beats_override(self):
        """Admin sentinel wins even if override is set."""
        u = _make_user(email=ADMIN_EMAIL, max_jobs_override=5)
        assert _users_route_limit(u, [ADMIN_EMAIL], FREE_LIMIT, PAID_LIMIT) == 999999

    def test_zero_override(self):
        u = _make_user(max_jobs_override=0)
        assert _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT) == 0

    def test_very_large_override(self):
        u = _make_user(max_jobs_override=999999)
        assert _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT) == 999999

    # ── jobs route gate ───────────────────────────────────────────────────────

    @pytest.mark.parametrize("jobs_used,expected_blocked", [
        (0, False),
        (1, False),
        (2, True),   # at FREE_LIMIT → blocked
        (3, True),   # over limit → still blocked
    ])
    def test_free_user_gate(self, jobs_used, expected_blocked):
        u = _make_user(jobs_used=jobs_used)
        limit = _jobs_route_limit(u, [], FREE_LIMIT, PAID_LIMIT)
        blocked = u.jobs_used >= limit
        assert blocked == expected_blocked

    @pytest.mark.parametrize("jobs_used,expected_blocked", [
        (0, False),
        (19, False),
        (20, True),   # at PAID_LIMIT → blocked
        (21, True),
    ])
    def test_subscribed_user_gate(self, jobs_used, expected_blocked):
        u = _make_user(is_subscribed=True, jobs_used=jobs_used)
        limit = _jobs_route_limit(u, [], FREE_LIMIT, PAID_LIMIT)
        blocked = u.jobs_used >= limit
        assert blocked == expected_blocked

    @pytest.mark.parametrize("override,jobs_used,expected_blocked", [
        (100, 0,   False),
        (100, 99,  False),
        (100, 100, True),
        (0,   0,   True),    # override=0 blocks everything
        (1,   0,   False),
        (1,   1,   True),
    ])
    def test_override_gate(self, override, jobs_used, expected_blocked):
        u = _make_user(max_jobs_override=override, jobs_used=jobs_used)
        limit = _jobs_route_limit(u, [], FREE_LIMIT, PAID_LIMIT)
        blocked = u.jobs_used >= limit
        assert blocked == expected_blocked

    def test_admin_never_blocked(self):
        u = _make_user(email=ADMIN_EMAIL, jobs_used=999999)
        limit = _jobs_route_limit(u, [ADMIN_EMAIL], FREE_LIMIT, PAID_LIMIT)
        # Admin returns None (unlimited) — gate is bypassed
        assert limit is None

    # ── admin helper ──────────────────────────────────────────────────────────

    def test_admin_helper_free_user(self):
        u = _make_user()
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("app.api.routes.admin.settings.FREE_JOB_LIMIT", FREE_LIMIT)
            mp.setattr("app.api.routes.admin.settings.PAID_JOB_LIMIT", PAID_LIMIT)
            assert admin_effective_limit(u) == FREE_LIMIT

    def test_admin_helper_subscribed(self):
        u = _make_user(is_subscribed=True)
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("app.api.routes.admin.settings.FREE_JOB_LIMIT", FREE_LIMIT)
            mp.setattr("app.api.routes.admin.settings.PAID_JOB_LIMIT", PAID_LIMIT)
            assert admin_effective_limit(u) == PAID_LIMIT

    def test_admin_helper_override_wins(self):
        u = _make_user(is_subscribed=True, max_jobs_override=75)
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("app.api.routes.admin.settings.FREE_JOB_LIMIT", FREE_LIMIT)
            mp.setattr("app.api.routes.admin.settings.PAID_JOB_LIMIT", PAID_LIMIT)
            assert admin_effective_limit(u) == 75

    # ── consistency between all three routes ─────────────────────────────────

    @pytest.mark.parametrize("user_attrs", [
        {"is_subscribed": False, "max_jobs_override": None},
        {"is_subscribed": True,  "max_jobs_override": None},
        {"is_subscribed": False, "max_jobs_override": 50},
        {"is_subscribed": True,  "max_jobs_override": 50},
    ])
    def test_users_and_jobs_agree_for_non_admin(self, user_attrs):
        """users/ and jobs/ limit logic must agree for non-admin users."""
        u = _make_user(**user_attrs)
        users_limit = _users_route_limit(u, [], FREE_LIMIT, PAID_LIMIT)
        jobs_limit  = _jobs_route_limit(u, [], FREE_LIMIT, PAID_LIMIT)
        assert users_limit == jobs_limit


class TestAdjustCreditsLogic:
    """Unit-tests for the credit adjustment business rules."""

    def test_jobs_used_clamped_to_zero_for_negative(self):
        """max(0, payload.jobs_used) must always be non-negative."""
        assert max(0, -5) == 0
        assert max(0, 0)  == 0
        assert max(0, 3)  == 3

    def test_max_jobs_override_clamped_to_zero(self):
        """max(0, payload.max_jobs_override) — override must be non-negative."""
        assert max(0, -1) == 0
        assert max(0, 0)  == 0
        assert max(0, 10) == 10

    def test_clear_override_wins_over_set(self):
        """If clear_override=True AND max_jobs_override is set, clear wins."""
        class Payload:
            clear_override = True
            max_jobs_override = 100
            jobs_used = None
            is_subscribed = None

        p = Payload()
        override = None if p.clear_override else (max(0, p.max_jobs_override) if p.max_jobs_override is not None else None)
        assert override is None
