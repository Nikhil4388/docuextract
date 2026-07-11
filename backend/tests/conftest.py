"""
Shared fixtures for all tests.
"""
import base64
import io
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

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
