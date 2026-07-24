"""
Tests: Auth guards — 401 / 403 enforcement across all route families.

Every protected endpoint must:
  - Return 401 with no Authorization header
  - Return 401 with a garbage token
  - Return 403 when a regular user hits an admin-only endpoint
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from tests.conftest import _base_user, make_mock_db, make_count_result, make_scalars_result, make_scalar_result


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def unauthed_client():
    """Client with NO dependency overrides — real auth is enforced."""
    from main import create_app
    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def regular_client():
    """Client authenticated as a plain user (no admin privileges)."""
    from main import create_app
    from app.api.deps import get_current_user, get_optional_user, get_db

    user = _base_user(email="plain@example.com")
    db = make_mock_db()

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app, raise_server_exceptions=False)


# ── 401 — unauthenticated ─────────────────────────────────────────────────────

class TestUnauthenticated:
    """
    Every route that requires a user must refuse requests with no token.
    FastAPI's HTTPBearer returns 403 (not 401) when no Authorization header
    is present — both 401 and 403 are acceptable "not authenticated" signals.
    """

    UNAUTHED = (401, 403)

    def test_users_me_requires_auth(self, unauthed_client):
        r = unauthed_client.get("/api/v1/users/me")
        assert r.status_code in self.UNAUTHED

    def test_jobs_list_requires_auth(self, unauthed_client):
        r = unauthed_client.get("/api/v1/jobs/")
        assert r.status_code in self.UNAUTHED

    def test_jobs_create_requires_auth(self, unauthed_client):
        r = unauthed_client.post("/api/v1/jobs/", json={})
        assert r.status_code in self.UNAUTHED

    def test_templates_list_requires_auth(self, unauthed_client):
        r = unauthed_client.get("/api/v1/templates/")
        assert r.status_code in self.UNAUTHED

    def test_admin_overview_requires_auth(self, unauthed_client):
        r = unauthed_client.get("/api/v1/admin/overview")
        assert r.status_code in self.UNAUTHED

    def test_admin_users_requires_auth(self, unauthed_client):
        r = unauthed_client.get("/api/v1/admin/users")
        assert r.status_code in self.UNAUTHED

    def test_admin_activity_requires_auth(self, unauthed_client):
        r = unauthed_client.get("/api/v1/admin/activity")
        assert r.status_code in self.UNAUTHED

    def test_admin_credits_requires_auth(self, unauthed_client):
        import uuid
        uid = str(uuid.uuid4())
        r = unauthed_client.patch(f"/api/v1/admin/users/{uid}/credits", json={})
        assert r.status_code in self.UNAUTHED


class TestBadToken:
    """Garbage / malformed Bearer tokens must be rejected with 401."""

    BAD_TOKENS = [
        "not-a-jwt",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.garbage.signature",
        "",
    ]

    @pytest.mark.parametrize("token", BAD_TOKENS)
    def test_users_me_bad_token(self, unauthed_client, token):
        r = unauthed_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code in (401, 403, 422)  # 422 for empty string (missing scheme)

    @pytest.mark.parametrize("token", BAD_TOKENS)
    def test_jobs_bad_token(self, unauthed_client, token):
        r = unauthed_client.get(
            "/api/v1/jobs/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code in (401, 403, 422)


# ── 403 — authenticated but not admin ────────────────────────────────────────

class TestNonAdminForbidden:
    """Regular users must be blocked from every admin endpoint with 403."""

    def test_overview_forbidden_for_regular_user(self, regular_client):
        r = regular_client.get("/api/v1/admin/overview")
        assert r.status_code == 403

    def test_list_users_forbidden_for_regular_user(self, regular_client):
        r = regular_client.get("/api/v1/admin/users")
        assert r.status_code == 403

    def test_user_jobs_forbidden_for_regular_user(self, regular_client):
        import uuid
        uid = str(uuid.uuid4())
        r = regular_client.get(f"/api/v1/admin/users/{uid}/jobs")
        assert r.status_code == 403

    def test_credits_forbidden_for_regular_user(self, regular_client):
        import uuid
        uid = str(uuid.uuid4())
        r = regular_client.patch(
            f"/api/v1/admin/users/{uid}/credits",
            json={"jobs_used": 0},
        )
        assert r.status_code == 403

    def test_activity_forbidden_for_regular_user(self, regular_client):
        r = regular_client.get("/api/v1/admin/activity")
        assert r.status_code == 403
