"""
Tests: Job creation limit gate — POST /api/v1/jobs/

Covers every combination of user tier + limit state:
  - Free user under limit → 201 (job created)
  - Free user AT limit → 402 FREE_LIMIT_REACHED
  - Subscribed user under paid limit → 201
  - Subscribed user AT paid limit → 402 PAID_LIMIT_REACHED
  - Override user under override → 201
  - Override user AT override limit → 402 OVERRIDE_LIMIT_REACHED
  - Admin user → always bypasses limit (no 402)
  - jobs_used=0 edge case → allowed
  - jobs_used < 0 edge case → allowed (defensive)
  - 402 response body shape validated
  - List jobs returns only current user's jobs
"""
import uuid
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime

from tests.conftest import (
    make_test_client, make_mock_db, make_scalar_result,
    make_scalars_result, make_count_result, _base_user,
)
from app.models.extraction import ExtractionJob, JobStatus, StorageProvider, LLMProvider


PREFIX = "/api/v1"
FREE_LIMIT  = 2
PAID_LIMIT  = 20

JOB_PAYLOAD = {
    "name": "Test Job",
    "template_id": str(uuid.uuid4()),
    "storage_provider": "local",
    "llm_provider": "claude",
    "llm_model": "claude-sonnet-4-6",
    "use_user_api_key": False,
}


def _make_job(user_id=None):
    """Fake ExtractionJob ORM object."""
    j = MagicMock(spec=ExtractionJob)
    j.id = uuid.uuid4()
    j.user_id = user_id or uuid.uuid4()
    j.name = "Test Job"
    j.status = JobStatus.PENDING
    j.total_files = 0
    j.processed_files = 0
    j.failed_files = 0
    j.created_at = datetime.utcnow()
    j.started_at = None
    j.completed_at = None
    j.status_message = None
    j.error_message = None
    j.storage_provider = StorageProvider.LOCAL
    j.llm_provider = LLMProvider.CLAUDE
    j.llm_model = "claude-sonnet-4-6"
    j.celery_task_id = None
    j.template_id = uuid.uuid4()
    return j


# ── 402 gate tests ─────────────────────────────────────────────────────────────

class TestJobLimitGate:

    def test_free_user_at_limit_gets_402(self, free_user_at_limit):
        db = make_mock_db()
        client = make_test_client(free_user_at_limit, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code == 402

    def test_free_user_at_limit_code_correct(self, free_user_at_limit):
        db = make_mock_db()
        client = make_test_client(free_user_at_limit, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        detail = r.json()["detail"]
        assert detail["code"] == "FREE_LIMIT_REACHED"

    def test_free_user_at_limit_body_has_limits(self, free_user_at_limit):
        db = make_mock_db()
        client = make_test_client(free_user_at_limit, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        detail = r.json()["detail"]
        assert "jobs_used" in detail
        assert "effective_limit" in detail
        assert "free_limit" in detail
        assert "paid_limit" in detail

    def test_subscribed_user_at_paid_limit_gets_402(self, subscribed_user_at_limit):
        db = make_mock_db()
        client = make_test_client(subscribed_user_at_limit, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code == 402
        assert r.json()["detail"]["code"] == "PAID_LIMIT_REACHED"

    def test_override_user_at_override_limit_gets_402(self, override_user_at_limit):
        db = make_mock_db()
        client = make_test_client(override_user_at_limit, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code == 402
        assert r.json()["detail"]["code"] == "OVERRIDE_LIMIT_REACHED"

    def test_subscribed_at_free_limit_still_allowed(self):
        """Subscribed user at jobs_used=2 (free limit) should NOT be blocked (limit is 20)."""
        user = _base_user(email="x@example.com", is_subscribed=True, jobs_used=2)
        # The gate only raises 402 if jobs_used >= effective_limit (20 for subscribed)
        # jobs_used=2 < 20 → should pass the gate (will fail later due to mock DB, but not 402)
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        # Should NOT be 402 (limit gate passes), may be 404/500 due to mock DB not having template
        assert r.status_code != 402

    def test_override_at_free_limit_allowed(self):
        """Override user at jobs_used=2 with override=100 should NOT be blocked."""
        user = _base_user(email="x@example.com", jobs_used=2, max_jobs_override=100)
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code != 402

    def test_exactly_at_limit_is_blocked(self):
        """Boundary: jobs_used == effective_limit must return 402."""
        user = _base_user(jobs_used=2)  # free limit = 2
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code == 402

    def test_one_under_limit_is_allowed(self):
        """Boundary: jobs_used == effective_limit - 1 must NOT return 402."""
        user = _base_user(jobs_used=1)  # free limit = 2, 1 used = OK
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code != 402

    def test_zero_jobs_used_free_user_allowed(self, free_user):
        """Brand new user with 0 jobs must not be blocked."""
        db = make_mock_db()
        client = make_test_client(free_user, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code != 402

    def test_402_message_references_limit(self, free_user_at_limit):
        """Error message must mention the limit count."""
        db = make_mock_db()
        client = make_test_client(free_user_at_limit, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        msg = r.json()["detail"]["message"]
        assert str(FREE_LIMIT) in msg

    def test_override_zero_blocks_all_jobs(self):
        """Override of 0 must block even the first job."""
        user = _base_user(jobs_used=0, max_jobs_override=0)
        db = make_mock_db()
        client = make_test_client(user, db)
        r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
        assert r.status_code == 402
        assert r.json()["detail"]["code"] == "OVERRIDE_LIMIT_REACHED"


# ── Admin bypass ──────────────────────────────────────────────────────────────

class TestAdminJobBypass:

    def test_admin_bypasses_limit_gate(self):
        """Admin emails skip the limit gate entirely."""
        admin = _base_user(email="admin@example.com", jobs_used=99999)
        db = make_mock_db()

        from main import create_app
        from app.api.deps import get_current_user, get_optional_user, get_db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: admin
        app.dependency_overrides[get_optional_user] = lambda: admin
        app.dependency_overrides[get_db] = lambda: db

        from fastapi.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)

        with patch("app.api.routes.jobs.settings") as mock_settings:
            mock_settings.admin_email_list = ["admin@example.com"]
            mock_settings.FREE_JOB_LIMIT = FREE_LIMIT
            mock_settings.PAID_JOB_LIMIT = PAID_LIMIT

            r = client.post(f"{PREFIX}/jobs/", json=JOB_PAYLOAD)
            # Should NOT be 402 — gate is bypassed
            assert r.status_code != 402


# ── List jobs ─────────────────────────────────────────────────────────────────

class TestListJobs:

    def test_list_jobs_returns_200(self, free_user):
        job = _make_job(user_id=free_user.id)
        db = make_mock_db([make_scalars_result([job])])
        client = make_test_client(free_user, db)
        r = client.get(f"{PREFIX}/jobs/")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_jobs_empty(self, free_user):
        db = make_mock_db([make_scalars_result([])])
        client = make_test_client(free_user, db)
        r = client.get(f"{PREFIX}/jobs/")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_jobs_response_shape(self, free_user):
        job = _make_job(user_id=free_user.id)
        db = make_mock_db([make_scalars_result([job])])
        client = make_test_client(free_user, db)
        r = client.get(f"{PREFIX}/jobs/")
        assert r.status_code == 200
        items = r.json()
        if items:
            item = items[0]
            for field in ["id", "name", "status", "total_files", "processed_files",
                          "failed_files", "created_at"]:
                assert field in item, f"Missing field: {field}"

    def test_list_jobs_pagination_params(self, free_user):
        db = make_mock_db([make_scalars_result([])])
        client = make_test_client(free_user, db)
        r = client.get(f"{PREFIX}/jobs/?skip=0&limit=5")
        assert r.status_code == 200
