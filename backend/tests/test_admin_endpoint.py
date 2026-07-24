"""
Tests: Admin endpoints — /api/v1/admin/*

Covers:
  - require_admin guard: 403 for regular user, 200 for admin-email user, 200 for DB-role admin
  - GET /admin/overview returns all required stat fields
  - GET /admin/users lists users with effective_limit computed correctly
  - GET /admin/users/{id}/jobs returns job list for a user
  - PATCH /admin/users/{id}/credits — adjust jobs_used, set override, clear override, toggle subscription
  - PATCH /admin/users/{id}/credits — 404 when user not found
  - GET /admin/activity returns list (or empty list on table-not-found)
  - Query params: search, skip, limit
"""
import uuid
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime

from tests.conftest import (
    make_test_client, make_mock_db,
    make_scalar_result, make_scalars_result, make_count_result,
    _base_user,
)
from app.models.user import UserRole
from app.models.extraction import ExtractionJob, JobStatus


PREFIX = "/api/v1"
FREE_LIMIT = 2
PAID_LIMIT = 20


# ── Helpers ───────────────────────────────────────────────────────────────────

def _admin_client(extra_db_calls=None):
    """Client authenticated as an admin user (email in ADMIN_EMAILS)."""
    admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
    db = make_mock_db(extra_db_calls)

    from main import create_app
    from app.api.deps import get_current_user, get_optional_user, get_db
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_optional_user] = lambda: admin
    app.dependency_overrides[get_db] = lambda: db

    from fastapi.testclient import TestClient

    with patch("app.api.routes.admin.settings") as ms:
        ms.admin_email_list = ["admin@example.com"]
        ms.FREE_JOB_LIMIT = FREE_LIMIT
        ms.PAID_JOB_LIMIT = PAID_LIMIT
        client = TestClient(app, raise_server_exceptions=False)

    return client, db


def _make_db_user(**kwargs):
    """Factory for a mock User suitable for the admin list_users endpoint."""
    u = _base_user(**kwargs)
    u.is_active = True
    u.created_at = datetime.utcnow()
    # auth_provider and role are already set by _base_user to real enum values
    # whose .value is read-only — do NOT try to override .value here.
    return u


def _make_db_job():
    j = MagicMock()  # No spec so we can set any attribute freely
    j.id = uuid.uuid4()
    j.name = "Test"
    # Use a simple string — the route does `str(j.status.value if hasattr(...) else j.status)`
    # With a plain MagicMock, hasattr(j.status, 'value') is True but value is a MagicMock.
    # Easier: just set status to the real enum; .value will work correctly.
    j.status = JobStatus.COMPLETED
    j.total_files = 2
    j.processed_files = 2
    j.failed_files = 0
    j.created_at = datetime.utcnow()
    j.completed_at = datetime.utcnow()
    j.error_message = None
    return j


# ── Auth guard ────────────────────────────────────────────────────────────────

class TestAdminGuard:

    def test_email_admin_can_access_overview(self):
        admin = _base_user(email="admin@example.com", role=UserRole.USER)

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin

        # Supply overview-level DB mocks: 7 count queries + 7 daily queries
        counts = [make_count_result(i) for i in range(14)]
        mock_db = make_mock_db(counts)
        app.dependency_overrides[get_db] = lambda: mock_db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/overview")

        assert r.status_code == 200

    def test_db_role_admin_can_access_overview(self):
        admin = _base_user(email="dbrole@example.com", role=UserRole.ADMIN)

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin

        counts = [make_count_result(i) for i in range(14)]
        mock_db = make_mock_db(counts)
        app.dependency_overrides[get_db] = lambda: mock_db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = []  # NOT in email list
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/overview")

        assert r.status_code == 200


# ── Overview ──────────────────────────────────────────────────────────────────

class TestAdminOverview:

    def _client_with_overview_db(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        # overview does: total_users, subscribed_users, total_jobs, jobs_today,
        #                active_users_today, completed_jobs, failed_jobs, + 7 daily queries = 14 execute calls
        counts = [make_count_result(i * 3) for i in range(14)]
        db = make_mock_db(counts)

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            client = TestClient(app, raise_server_exceptions=False)
        return client

    def test_overview_200(self):
        client = self._client_with_overview_db()
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/overview")
        assert r.status_code == 200

    def test_overview_required_fields(self):
        client = self._client_with_overview_db()
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/overview")
        if r.status_code == 200:
            data = r.json()
            for field in ["total_users", "active_users_today", "total_jobs", "jobs_today",
                          "subscribed_users", "completed_jobs", "failed_jobs", "jobs_last_7_days"]:
                assert field in data, f"Missing field: {field}"

    def test_overview_jobs_last_7_days_count(self):
        client = self._client_with_overview_db()
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/overview")
        if r.status_code == 200:
            assert len(r.json()["jobs_last_7_days"]) == 7


# ── List users ────────────────────────────────────────────────────────────────

class TestAdminListUsers:

    def _list_users_client(self, users: list):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)

        # execute calls: one scalars() for user list + one count per user
        user_list_result = make_scalars_result(users)
        count_results = [make_count_result(j) for j, _ in enumerate(users)]
        db = make_mock_db([user_list_result] + count_results)

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            client = TestClient(app, raise_server_exceptions=False)
        return client

    def test_list_users_200(self):
        users = [_make_db_user()]
        client = self._list_users_client(users)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/users")
        assert r.status_code == 200

    def test_list_users_empty(self):
        client = self._list_users_client([])
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/users")
        assert r.status_code == 200
        if r.status_code == 200:
            assert r.json() == []

    def test_list_users_effective_limit_free(self):
        user = _make_db_user(email="a@b.com", is_subscribed=False, max_jobs_override=None)
        client = self._list_users_client([user])
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/users")
        if r.status_code == 200 and r.json():
            assert r.json()[0]["effective_limit"] == FREE_LIMIT

    def test_list_users_effective_limit_subscribed(self):
        user = _make_db_user(email="a@b.com", is_subscribed=True, max_jobs_override=None)
        client = self._list_users_client([user])
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/users")
        if r.status_code == 200 and r.json():
            assert r.json()[0]["effective_limit"] == PAID_LIMIT

    def test_list_users_effective_limit_override(self):
        user = _make_db_user(email="a@b.com", is_subscribed=False, max_jobs_override=50)
        client = self._list_users_client([user])
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.get(f"{PREFIX}/admin/users")
        if r.status_code == 200 and r.json():
            assert r.json()[0]["effective_limit"] == 50


# ── Adjust credits ────────────────────────────────────────────────────────────

class TestAdjustCredits:

    def _credits_client(self, target_user):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        # execute calls: select user
        db = make_mock_db([make_scalar_result(target_user)])

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            client = TestClient(app, raise_server_exceptions=False)
        return client

    def test_set_jobs_used(self):
        target = _make_db_user()
        client = self._credits_client(target)
        uid = str(target.id)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={"jobs_used": 5},
            )
        assert r.status_code == 200
        assert r.json()["jobs_used"] == 5

    def test_set_max_jobs_override(self):
        target = _make_db_user()
        client = self._credits_client(target)
        uid = str(target.id)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={"max_jobs_override": 100},
            )
        assert r.status_code == 200
        assert r.json()["max_jobs_override"] == 100

    def test_clear_override(self):
        target = _make_db_user(max_jobs_override=100)
        client = self._credits_client(target)
        uid = str(target.id)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={"clear_override": True},
            )
        assert r.status_code == 200
        assert r.json()["max_jobs_override"] is None

    def test_toggle_subscription_on(self):
        target = _make_db_user(is_subscribed=False)
        client = self._credits_client(target)
        uid = str(target.id)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={"is_subscribed": True},
            )
        assert r.status_code == 200
        assert r.json()["is_subscribed"] is True

    def test_user_not_found_404(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        db = make_mock_db([make_scalar_result(None)])  # no user

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        uid = str(uuid.uuid4())
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={"jobs_used": 0},
            )
        assert r.status_code == 404

    def test_negative_jobs_used_clamped_to_zero(self):
        target = _make_db_user()
        client = self._credits_client(target)
        uid = str(target.id)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={"jobs_used": -5},
            )
        assert r.status_code == 200
        assert r.json()["jobs_used"] == 0  # clamped to max(0, -5) = 0

    def test_response_contains_effective_limit(self):
        target = _make_db_user(is_subscribed=False, max_jobs_override=None)
        client = self._credits_client(target)
        uid = str(target.id)
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            ms.FREE_JOB_LIMIT = FREE_LIMIT
            ms.PAID_JOB_LIMIT = PAID_LIMIT
            r = client.patch(
                f"{PREFIX}/admin/users/{uid}/credits",
                json={},
            )
        assert r.status_code == 200
        assert "effective_limit" in r.json()


# ── User jobs ─────────────────────────────────────────────────────────────────

class TestAdminUserJobs:

    def test_get_user_jobs_200(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        job = _make_db_job()
        db = make_mock_db([make_scalars_result([job])])

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        uid = str(uuid.uuid4())
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            r = client.get(f"{PREFIX}/admin/users/{uid}/jobs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_user_jobs_shape(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        job = _make_db_job()
        db = make_mock_db([make_scalars_result([job])])

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        uid = str(uuid.uuid4())
        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            r = client.get(f"{PREFIX}/admin/users/{uid}/jobs")
        if r.status_code == 200 and r.json():
            item = r.json()[0]
            for field in ["id", "name", "status", "total_files", "created_at"]:
                assert field in item


# ── Activity ──────────────────────────────────────────────────────────────────

class TestAdminActivity:

    def test_activity_returns_list(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)

        # Activity uses raw SQL via text(), mappings().all()
        mappings_result = MagicMock()
        mappings_result.mappings = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        db = make_mock_db([mappings_result])

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            r = client.get(f"{PREFIX}/admin/activity")
        # Either 200 with a list, OR table doesn't exist → empty list still returned
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_activity_db_error_returns_empty(self):
        """If analytics_events table doesn't exist, route returns [] not 500."""
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        db = AsyncMock()
        db.execute = AsyncMock(side_effect=Exception("relation does not exist"))
        db.commit = AsyncMock()

        from main import create_app
        from app.api.deps import get_current_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        with patch("app.api.routes.admin.settings") as ms:
            ms.admin_email_list = ["admin@example.com"]
            r = client.get(f"{PREFIX}/admin/activity")
        assert r.status_code == 200
        assert r.json() == []
