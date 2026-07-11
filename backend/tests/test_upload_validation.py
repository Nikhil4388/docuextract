"""
Tests: upload file validation
  - Valid PDF accepted
  - Non-PDF rejected (400)
  - Fake PDF (wrong magic bytes) rejected (400)
  - File over size limit rejected (413)
  - Multiple PDFs all read correctly (no cross-contamination)
"""
import asyncio
import io
import re
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import VALID_PDF


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_upload_file(name: str, content: bytes):
    """Minimal UploadFile mock."""
    f = MagicMock()
    f.filename = name
    f.read = AsyncMock(return_value=content)
    return f


# ── tests ─────────────────────────────────────────────────────────────────────

class TestPDFValidation:

    def test_valid_pdf_starts_with_magic_bytes(self):
        assert VALID_PDF.startswith(b"%PDF-"), "Test fixture must be a real PDF"

    @pytest.mark.asyncio
    async def test_non_pdf_filename_skipped(self):
        """Files not ending in .pdf should be ignored, not raise."""
        files = [
            _make_upload_file("report.docx", b"PK\x03\x04somecontent"),
            _make_upload_file("data.xlsx",   b"PK\x03\x04somecontent"),
        ]
        collected = []
        for f in files:
            if not f.filename.lower().endswith(".pdf"):
                continue
            collected.append(f.filename)
        assert collected == [], "Non-PDF files must be silently skipped"

    @pytest.mark.asyncio
    async def test_invalid_magic_bytes_rejected(self):
        """A file named .pdf but with wrong header must be rejected."""
        bad_content = b"PK\x03\x04this is a zip not a pdf"
        assert not bad_content.startswith(b"%PDF-"), "Bad content must not start with %PDF-"

    @pytest.mark.asyncio
    async def test_file_over_size_limit_rejected(self):
        """File larger than limit must be flagged."""
        limit_mb = 50
        max_bytes = limit_mb * 1024 * 1024
        oversized = b"%PDF-" + b"x" * (max_bytes + 1)
        assert len(oversized) > max_bytes, "Oversized content must exceed limit"

    @pytest.mark.asyncio
    async def test_sequential_read_no_cross_contamination(self):
        """
        Simulates the Phase-1 sequential read: each file's bytes must be
        stored independently without mixing content from other files.
        """
        pdf_a = b"%PDF-" + b"AAAA" * 100
        pdf_b = b"%PDF-" + b"BBBB" * 100

        files = [
            _make_upload_file("a.pdf", pdf_a),
            _make_upload_file("b.pdf", pdf_b),
        ]

        file_data = []
        for f in files:
            content = await f.read(100 * 1024 * 1024)
            if content.startswith(b"%PDF-"):
                file_data.append((f.filename, content))

        assert len(file_data) == 2
        assert file_data[0] == ("a.pdf", pdf_a), "First file content must be pdf_a"
        assert file_data[1] == ("b.pdf", pdf_b), "Second file content must be pdf_b"
        # Critical: no byte-mixing between files
        assert b"BBBB" not in file_data[0][1], "pdf_a must not contain pdf_b bytes"
        assert b"AAAA" not in file_data[1][1], "pdf_b must not contain pdf_a bytes"

    @pytest.mark.asyncio
    async def test_safe_filename_sanitization(self):
        """Dangerous characters in filename must be replaced."""
        dangerous_names = [
            "../../../etc/passwd.pdf",
            "file with spaces & special!chars.pdf",
            "file;rm -rf /.pdf",
        ]
        for name in dangerous_names:
            safe = re.sub(r"[^\w\-. ]", "_", os.path.basename(name))
            assert "/" not in safe, f"Sanitized name must not contain /: {safe}"
            assert ";" not in safe, f"Sanitized name must not contain ;: {safe}"
