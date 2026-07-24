"""
Tests: POST /templates/upload-sample resilience

The analyze endpoint must NEVER return an unhandled 500:
  - AI failure → 200 with suggested_columns: [] and analysis_failed: true
  - Success → 200 with suggested_columns list
  - Non-PDF → 400
  - Global exception handler adds CORS headers to unhandled 500s
"""
import io
import pytest
from unittest.mock import patch, AsyncMock

from tests.conftest import make_test_client, make_mock_db, _base_user, VALID_PDF

PREFIX = "/api/v1"


class TestUploadSampleResilience:

    def _client(self, user):
        db = make_mock_db()
        return make_test_client(user, db)

    def test_ai_failure_returns_200_with_flag(self, regular_user, tmp_path):
        """If suggest_columns raises, endpoint returns analysis_failed, not 500."""
        client = self._client(regular_user)
        with patch("app.api.routes.templates.PDFExtractor") as MockExtractor, \
             patch("app.api.routes.templates.settings") as ms:
            ms.MAX_UPLOAD_SIZE_MB = 50
            ms.UPLOAD_DIR = str(tmp_path)
            MockExtractor.return_value.suggest_columns = AsyncMock(
                side_effect=RuntimeError("Claude API overloaded")
            )
            r = client.post(
                f"{PREFIX}/templates/upload-sample",
                files={"file": ("resume.pdf", io.BytesIO(VALID_PDF), "application/pdf")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["suggested_columns"] == []
        assert data["analysis_failed"] is True

    def test_ai_success_returns_columns(self, regular_user, tmp_path):
        client = self._client(regular_user)
        cols = [{"name": "Invoice Number", "data_type": "text",
                 "description": "x", "extraction_hint": "top"}]
        with patch("app.api.routes.templates.PDFExtractor") as MockExtractor, \
             patch("app.api.routes.templates.settings") as ms:
            ms.MAX_UPLOAD_SIZE_MB = 50
            ms.UPLOAD_DIR = str(tmp_path)
            MockExtractor.return_value.suggest_columns = AsyncMock(return_value=cols)
            r = client.post(
                f"{PREFIX}/templates/upload-sample",
                files={"file": ("invoice.pdf", io.BytesIO(VALID_PDF), "application/pdf")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["suggested_columns"] == cols
        assert "analysis_failed" not in data

    def test_non_pdf_rejected_400(self, regular_user):
        client = self._client(regular_user)
        r = client.post(
            f"{PREFIX}/templates/upload-sample",
            files={"file": ("data.xlsx", io.BytesIO(b"PK\x03\x04"), "application/vnd.ms-excel")},
        )
        assert r.status_code == 400

    def test_unauthenticated_rejected(self):
        from main import create_app
        from fastapi.testclient import TestClient
        app = create_app()
        client = TestClient(app, raise_server_exceptions=False)
        r = client.post(
            f"{PREFIX}/templates/upload-sample",
            files={"file": ("x.pdf", io.BytesIO(VALID_PDF), "application/pdf")},
        )
        assert r.status_code in (401, 403)


class TestGlobalExceptionHandlerCORS:
    """Unhandled 500s must carry CORS headers so browsers surface the real
    error instead of a fake 'network error'."""

    def _crashing_app_client(self):
        from main import create_app
        from fastapi.testclient import TestClient
        app = create_app()

        @app.get("/api/v1/_test_crash")
        async def crash():
            raise RuntimeError("boom")

        return TestClient(app, raise_server_exceptions=False)

    def test_500_has_cors_header_for_allowed_origin(self):
        client = self._crashing_app_client()
        r = client.get(
            "/api/v1/_test_crash",
            headers={"Origin": "https://multipdfstoexcel.com"},
        )
        assert r.status_code == 500
        assert r.headers.get("access-control-allow-origin") == "https://multipdfstoexcel.com"
        assert r.json() == {"detail": "Internal server error"}

    def test_500_no_cors_header_for_unknown_origin(self):
        client = self._crashing_app_client()
        r = client.get(
            "/api/v1/_test_crash",
            headers={"Origin": "https://evil.example.com"},
        )
        assert r.status_code == 500
        assert r.headers.get("access-control-allow-origin") is None

    def test_500_body_is_json_not_plain_text(self):
        client = self._crashing_app_client()
        r = client.get("/api/v1/_test_crash")
        assert r.status_code == 500
        assert r.json()["detail"] == "Internal server error"
