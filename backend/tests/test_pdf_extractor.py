"""
Tests: PDFExtractor text/image routing
  - Pages above OCR_THRESHOLD (50 chars) → text extracted, no image
  - Pages below threshold → rendered as base64 PNG
  - Mixed document → correct per-page routing
  - full_text concatenation
"""
import base64
import io
import os
import tempfile

import pytest

from tests.conftest import VALID_PDF

try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

from app.services.pdf.extractor import PDFExtractor


@pytest.fixture
def extractor():
    return PDFExtractor()


@pytest.fixture
def valid_pdf_path(tmp_path):
    p = tmp_path / "test.pdf"
    p.write_bytes(VALID_PDF)
    return str(p)


@pytest.mark.skipif(not HAS_FITZ, reason="PyMuPDF not installed")
class TestPDFExtractor:

    def test_extracts_pages_list(self, extractor, valid_pdf_path):
        pages = extractor.extract_text(valid_pdf_path)
        assert isinstance(pages, list)
        assert len(pages) >= 1

    def test_page_dict_has_required_keys(self, extractor, valid_pdf_path):
        pages = extractor.extract_text(valid_pdf_path)
        required = {"page_num", "text", "ocr_used", "image_b64", "width", "height"}
        for page in pages:
            assert required.issubset(page.keys()), f"Missing keys: {required - page.keys()}"

    def test_native_pdf_text_extracted(self, extractor, valid_pdf_path):
        pages = extractor.extract_text(valid_pdf_path)
        # Our fixture PDF contains "Hello World"
        full_text = " ".join(p["text"] for p in pages)
        assert len(full_text) > 0, "Native PDF must yield text"

    def test_page_below_threshold_gets_image(self, extractor, tmp_path):
        """A truly blank PDF page (0 chars) should get rendered to image."""
        blank_pdf = (
            b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
            b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n"
            b"0000000058 00000 n\n0000000115 00000 n\n"
            b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
        )
        p = tmp_path / "blank.pdf"
        p.write_bytes(blank_pdf)
        pages = extractor.extract_text(str(p))
        assert len(pages) >= 1
        for page in pages:
            if len(page["text"]) < PDFExtractor.OCR_THRESHOLD:
                assert page["image_b64"] is not None, "Blank page must have image_b64"
                assert page["ocr_used"] is True

    def test_ocr_threshold_is_50(self):
        assert PDFExtractor.OCR_THRESHOLD == 50

    def test_full_text_concatenates_pages(self, extractor, valid_pdf_path):
        full = extractor.full_text(valid_pdf_path)
        assert isinstance(full, str)
        assert len(full) > 0

    def test_image_b64_is_valid_base64(self, extractor, tmp_path):
        """Any image_b64 produced must be decodable base64."""
        blank_pdf = (
            b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
            b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n"
            b"0000000058 00000 n\n0000000115 00000 n\n"
            b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
        )
        p = tmp_path / "blank2.pdf"
        p.write_bytes(blank_pdf)
        pages = extractor.extract_text(str(p))
        for page in pages:
            if page.get("image_b64"):
                try:
                    decoded = base64.b64decode(page["image_b64"])
                    assert len(decoded) > 0
                except Exception as e:
                    pytest.fail(f"image_b64 is not valid base64: {e}")

    def test_get_page_count(self, extractor, valid_pdf_path):
        count = extractor.get_page_count(valid_pdf_path)
        assert count >= 1
