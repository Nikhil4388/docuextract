"""
Shared fixtures for all tests.
"""
import base64
import io
import sys
import os
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.user import User, UserRole, AuthProvider
from app.models.extraction import ExtractionJob, JobStatus, StorageProvider, LLMProvider
from app.api.deps import get_current_user, get_optional_user
from app.core.database import get_db


# ── DB mock helpers ───────────────────────────────────────────────────────────

def make_scalar_result(value):
    """Result mock where .scalar_one() / .scalar_one_or_none() return `value`."""
    r = MagicMock()
    r.scalar_one = MagicMock(return_value=value)
    r.scalar_one_or_none = MagicMock(return_value=value)
    r.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[] if value is None else [value])))
    r.mappings = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
    return r


def make_scalars_result(values: list):
    """Result mock where .scalars().all() returns `values` and scalar_one returns values[0]."""
    r = MagicMock()
    r.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=values)))
    r.scalar_one = MagicMock(return_value=values[0] if values else None)
    r.scalar_one_or_none = MagicMock(return_value=values[0] if values else None)
    r.mappings = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
    return r


def make_count_result(n: int):
    """Result mock for count queries."""
    r = MagicMock()
    r.scalar_one = MagicMock(return_value=n)
    r.scalar_one_or_none = MagicMock(return_value=n)
    return r


def make_mock_db(side_effects=None):
    """
    Create a mock AsyncSession.
    side_effects: list of return values for successive execute() calls.
    If None, execute() returns a generic empty result.
    """
    db = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.close = AsyncMock()
    if side_effects:
        db.execute = AsyncMock(side_effect=side_effects)
    else:
        db.execute = AsyncMock(return_value=make_count_result(0))
    return db


# ── User factories ─────────────────────────────────────────────────────────────

def _base_user(**kwargs):
    u = MagicMock(spec=User)
    u.id = uuid.uuid4()
    u.email = kwargs.get("email", "user@example.com")
    u.full_name = kwargs.get("full_name", "Test User")
    u.avatar_url = None
    u.location = None
    u.is_active = True
    u.is_verified = True
    u.auth_provider = AuthProvider.GOOGLE
    u.role = kwargs.get("role", UserRole.USER)
    u.is_subscribed = kwargs.get("is_subscribed", False)
    u.jobs_used = kwargs.get("jobs_used", 0)
    u.max_jobs_override = kwargs.get("max_jobs_override", None)
    u.last_seen_at = None
    u.created_at = datetime.utcnow()
    u.anthropic_api_key_enc = None
    u.openai_api_key_enc = None
    return u


@pytest.fixture
def free_user():
    """Regular user, not subscribed, 0 jobs used."""
    return _base_user(email="free@example.com", jobs_used=0)


@pytest.fixture
def free_user_at_limit():
    """Free user who has used all free jobs (limit = 2)."""
    return _base_user(email="free_limit@example.com", jobs_used=2)


@pytest.fixture
def subscribed_user():
    """Subscribed user, 0 jobs used."""
    return _base_user(email="paid@example.com", is_subscribed=True, jobs_used=0)


@pytest.fixture
def subscribed_user_at_limit():
    """Subscribed user who has used all paid jobs (limit = 20)."""
    return _base_user(email="paid_limit@example.com", is_subscribed=True, jobs_used=20)


@pytest.fixture
def override_user():
    """User with admin-set override of 100 jobs, 5 used."""
    return _base_user(email="override@example.com", jobs_used=5, max_jobs_override=100)


@pytest.fixture
def override_user_at_limit():
    """User with override=100 who has used all 100 jobs."""
    return _base_user(email="override_limit@example.com", jobs_used=100, max_jobs_override=100)


@pytest.fixture
def admin_user():
    """Admin user identified by email (set in settings.ADMIN_EMAILS)."""
    return _base_user(email="admin@example.com", role=UserRole.ADMIN, jobs_used=9999)


@pytest.fixture
def regular_user():
    """Alias for free_user for non-limit tests."""
    return _base_user()


# ── App + client factory ──────────────────────────────────────────────────────

def make_test_client(user_override=None, db_override=None):
    """
    Build a TestClient with dependency overrides.
    user_override: User instance to return from get_current_user, or None to disable auth.
    db_override: AsyncSession mock to return from get_db.
    """
    from main import create_app
    app = create_app()

    if user_override is not None:
        app.dependency_overrides[get_current_user] = lambda: user_override
        app.dependency_overrides[get_optional_user] = lambda: user_override
    if db_override is not None:
        app.dependency_overrides[get_db] = lambda: db_override

    return TestClient(app, raise_server_exceptions=False)

# ── Minimal valid PDF bytes ───────────────────────────────────────────────────
VALID_PDF = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
    b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    b"4 0 obj\n<< /Length 44 >>\nstream\n"
    b"BT /F1 12 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\n"
    b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    b"xref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n"
    b"0000000058 00000 n\n0000000115 00000 n\n0000000266 00000 n\n"
    b"0000000360 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n441\n%%EOF"
)

VALID_PDF_B64 = base64.b64encode(VALID_PDF).decode()

# Sample columns used across tests
SAMPLE_COLUMNS = [
    {"name": "Company Name",    "data_type": "text",   "description": "Issuing company"},
    {"name": "Interest Rate",   "data_type": "number", "description": "Annual interest rate"},
    {"name": "Agreement Date",  "data_type": "date",   "description": "Date of agreement"},
    {"name": "Bond Amount",     "data_type": "number", "description": "Total bond amount"},
    {"name": "Maturity Date",   "data_type": "date",   "description": "Bond maturity date"},
]


def make_llm_response(extracted: dict, scores: dict | None = None) -> str:
    """Build a JSON string that mimics Claude's extraction response."""
    import json
    if scores is None:
        scores = {k: 0.99 for k in extracted}
    return json.dumps({"extracted_data": extracted, "confidence_scores": scores})


@pytest.fixture
def sample_job_id():
    return str(uuid.uuid4())


@pytest.fixture
def sample_columns():
    return SAMPLE_COLUMNS
