"""
Tests: PATCH /admin/users/{id}/role — promote/demote admin

Covers:
  - Admin can promote a user to admin
  - Admin can demote another admin to user
  - Admin CANNOT demote themselves (400 — lockout prevention)
  - 404 when target user not found
  - 403 for non-admin caller
  - DB-role admin is recognized by /users/me (is_admin: true, sentinel limit)
"""
import uuid
import pytest
from unittest.mock import patch

from tests.conftest import (
    make_test_client, make_mock_db, make_scalar_result, _base_user,
)
from app.models.user import UserRole

PREFIX = "/api/v1"


def _admin_client_with_target(admin, target):
    from main import create_app
    from app.api.deps import get_current_user
    from app.core.database import get_db

    db = make_mock_db([make_scalar_result(target)])
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_db] = lambda: db

    from fastapi.testclient import TestClient
    return TestClient(app, raise_server_exceptions=False)


class TestSetUserRole:

    def test_promote_user_to_admin(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        target = _base_user(email="user@example.com", role=UserRole.USER)
        client = _admin_client_with_target(admin, target)

        r = client.patch(f"{PREFIX}/admin/users/{target.id}/role", json={"is_admin": True})
        assert r.status_code == 200
        assert r.json()["is_admin"] is True
        assert target.role == UserRole.ADMIN

    def test_demote_admin_to_user(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        target = _base_user(email="other-admin@example.com", role=UserRole.ADMIN)
        client = _admin_client_with_target(admin, target)

        r = client.patch(f"{PREFIX}/admin/users/{target.id}/role", json={"is_admin": False})
        assert r.status_code == 200
        assert r.json()["is_admin"] is False
        assert target.role == UserRole.USER

    def test_cannot_demote_self(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        # Target IS the admin themselves
        client = _admin_client_with_target(admin, admin)

        r = client.patch(f"{PREFIX}/admin/users/{admin.id}/role", json={"is_admin": False})
        assert r.status_code == 400
        assert "own admin access" in r.json()["detail"]

    def test_can_promote_self_is_noop_allowed(self):
        """Promoting yourself (already admin) is harmless and allowed."""
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        client = _admin_client_with_target(admin, admin)

        r = client.patch(f"{PREFIX}/admin/users/{admin.id}/role", json={"is_admin": True})
        assert r.status_code == 200

    def test_target_not_found_404(self):
        admin = _base_user(email="admin@example.com", role=UserRole.ADMIN)
        client = _admin_client_with_target(admin, None)

        r = client.patch(f"{PREFIX}/admin/users/{uuid.uuid4()}/role", json={"is_admin": True})
        assert r.status_code == 404

    def test_non_admin_forbidden(self):
        regular = _base_user(email="pleb@example.com", role=UserRole.USER)
        target = _base_user(email="x@example.com", role=UserRole.USER)
        client = _admin_client_with_target(regular, target)

        r = client.patch(f"{PREFIX}/admin/users/{target.id}/role", json={"is_admin": True})
        assert r.status_code == 403


class TestDbRoleAdminRecognition:
    """A user promoted via the dashboard (DB role) must be treated as admin
    by /users/me even if their email is NOT in ADMIN_EMAILS."""

    def test_users_me_recognizes_db_role_admin(self):
        db_admin = _base_user(email="promoted@example.com", role=UserRole.ADMIN, jobs_used=50)
        db = make_mock_db()
        client = make_test_client(db_admin, db)

        with patch("app.api.routes.users.settings") as ms:
            ms.admin_email_list = []          # NOT in the env list
            ms.FREE_JOB_LIMIT = 2
            ms.PAID_JOB_LIMIT = 20
            r = client.get(f"{PREFIX}/users/me")

        assert r.status_code == 200
        data = r.json()
        assert data["is_admin"] is True
        assert data["effective_limit"] == 999999  # admin sentinel

    def test_users_me_regular_user_not_admin(self):
        regular = _base_user(email="normal@example.com", role=UserRole.USER)
        db = make_mock_db()
        client = make_test_client(regular, db)

        with patch("app.api.routes.users.settings") as ms:
            ms.admin_email_list = []
            ms.FREE_JOB_LIMIT = 2
            ms.PAID_JOB_LIMIT = 20
            r = client.get(f"{PREFIX}/users/me")

        assert r.status_code == 200
        assert r.json()["is_admin"] is False

    def test_db_role_admin_bypasses_job_limit(self):
        """DB-role admin at 9999 jobs must NOT get 402 on job creation."""
        db_admin = _base_user(email="promoted@example.com", role=UserRole.ADMIN, jobs_used=9999)
        db = make_mock_db()
        client = make_test_client(db_admin, db)

        with patch("app.api.routes.jobs.settings") as ms:
            ms.admin_email_list = []
            ms.FREE_JOB_LIMIT = 2
            ms.PAID_JOB_LIMIT = 20
            r = client.post(f"{PREFIX}/jobs/", json={
                "name": "t", "template_id": str(uuid.uuid4()),
                "storage_provider": "local", "llm_provider": "claude",
                "use_user_api_key": False,
            })
        assert r.status_code != 402
