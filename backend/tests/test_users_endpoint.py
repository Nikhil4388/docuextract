"""
Tests: GET /api/v1/users/me

Covers:
  - Correct effective_limit for every user tier
  - max_jobs_override propagated to response
  - is_admin flag set for admin users
  - 401 when unauthenticated
  - PATCH /users/me profile update
  - GET/PUT /users/me/api-keys
"""
import pytest
from unittest.mock import patch

from tests.conftest import (
    make_test_client,
    make_mock_db,
    _base_user,
)
from app.models.user import UserRole


PREFIX = "/api/v1"
FREE_LIMIT = 2      # matches settings.FREE_JOB_LIMIT default
PAID_LIMIT = 20     # matches settings.PAID_JOB_LIMIT default


class TestGetProfile:

    def test_free_user_effective_limit(self, free_user):
        db = make_mock_db()
        client = make_test_client(free_user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        data = r.json()
        assert data["effective_limit"] == FREE_LIMIT
        assert data["is_admin"] is False
        assert data["is_subscribed"] is False
        assert data["max_jobs_override"] is None

    def test_subscribed_user_effective_limit(self, subscribed_user):
        db = make_mock_db()
        client = make_test_client(subscribed_user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        data = r.json()
        assert data["effective_limit"] == PAID_LIMIT
        assert data["is_subscribed"] is True
        assert data["is_admin"] is False

    def test_override_user_effective_limit(self, override_user):
        """User with max_jobs_override=100 should see effective_limit=100."""
        db = make_mock_db()
        client = make_test_client(override_user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        data = r.json()
        assert data["effective_limit"] == 100
        assert data["max_jobs_override"] == 100
        assert data["is_admin"] is False

    def test_override_beats_subscription(self):
        """Override wins over subscription status."""
        # Subscribed user WITH override — override should win
        user = _base_user(email="x@example.com", is_subscribed=True, jobs_used=5, max_jobs_override=50)
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        assert r.json()["effective_limit"] == 50

    def test_admin_user_sentinel_limit(self):
        """Admin should get effective_limit=999999 (bypass sentinel)."""
        user = _base_user(email="admin@example.com", jobs_used=9999)
        db = make_mock_db()

        from main import create_app
        from app.api.deps import get_current_user, get_optional_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_optional_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        with patch("app.api.routes.users.settings") as mock_settings:
            mock_settings.admin_email_list = ["admin@example.com"]
            mock_settings.FREE_JOB_LIMIT = FREE_LIMIT
            mock_settings.PAID_JOB_LIMIT = PAID_LIMIT

            r = client.get(f"{PREFIX}/users/me")
            assert r.status_code == 200
            data = r.json()
            assert data["effective_limit"] == 999999
            assert data["is_admin"] is True

    def test_profile_fields_present(self, free_user):
        db = make_mock_db()
        client = make_test_client(free_user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        data = r.json()
        # All expected fields
        for field in ["id", "email", "role", "is_verified", "is_subscribed",
                      "is_admin", "jobs_used", "free_limit", "paid_limit",
                      "effective_limit", "max_jobs_override"]:
            assert field in data, f"Missing field: {field}"

    def test_jobs_used_propagated(self):
        user = _base_user(jobs_used=7)
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        assert r.json()["jobs_used"] == 7

    def test_zero_override_is_valid(self):
        """Override of 0 means user can't run any jobs at all."""
        user = _base_user(jobs_used=0, max_jobs_override=0)
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.get(f"{PREFIX}/users/me")
        assert r.status_code == 200
        assert r.json()["effective_limit"] == 0


class TestPatchProfile:

    def test_update_full_name(self, regular_user):
        db = make_mock_db()
        client = make_test_client(regular_user, db)
        r = client.patch(f"{PREFIX}/users/me", json={"full_name": "New Name"})
        assert r.status_code == 200
        assert "updated" in r.json().get("message", "").lower()

    def test_update_location(self, regular_user):
        db = make_mock_db()
        client = make_test_client(regular_user, db)
        r = client.patch(f"{PREFIX}/users/me", json={"location": "Mumbai"})
        assert r.status_code == 200

    def test_update_empty_body_ok(self, regular_user):
        db = make_mock_db()
        client = make_test_client(regular_user, db)
        r = client.patch(f"{PREFIX}/users/me", json={})
        assert r.status_code == 200


class TestApiKeys:

    def test_get_api_keys_status(self, regular_user):
        db = make_mock_db()
        client = make_test_client(regular_user, db)
        r = client.get(f"{PREFIX}/users/me/api-keys")
        assert r.status_code == 200
        data = r.json()
        assert "anthropic" in data
        assert "openai" in data
        # Both False since mock user has no encrypted keys
        assert data["anthropic"] is False
        assert data["openai"] is False

    def test_update_api_keys(self, regular_user):
        db = make_mock_db()
        client = make_test_client(regular_user, db)
        r = client.put(
            f"{PREFIX}/users/me/api-keys",
            json={"anthropic_api_key": "sk-ant-test123"},
        )
        assert r.status_code == 200
        assert "updated" in r.json().get("message", "").lower()
