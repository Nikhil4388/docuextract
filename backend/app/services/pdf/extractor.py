"""
PDF text extraction.
- Native text PDFs: PyMuPDF direct text extraction
- Scanned/photo PDFs: page rendered as image and sent to Claude Vision
  (much more accurate than Tesseract for blurry/rotated/handwritten docs)
- Mixed documents (e.g. 1800s scans): images sent alongside text so Claude
  can cross-reference when OCR text is garbled
"""
import os
import io
import base64
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path

import fitz  # PyMuPDF


def _is_garbage_ocr(text: str) -> bool:
    """
    Detect pages where PyMuPDF extracted text but it's clearly garbled OCR.
    Heuristics:
      - Very short (< 200 chars) — not enough signal
      - High ratio of non-ASCII / punctuation characters
      - Most 'words' are 1-2 chars (fragmented glyphs)
    """
    if len(text) < 200:
        return True
    words = text.split()
    if not words:
        return True
    short_words = sum(1 for w in words if len(w) <= 2)
    special_chars = sum(1 for c in text if ord(c) > 127 or c in '£|¬§©®°±×÷')
    short_ratio = short_words / len(words)
    special_ratio = special_chars / len(text)
    return short_ratio > 0.6 or special_ratio > 0.05


def _render_page_image(page) -> str:
    """Render a PDF page to a base64 PNG at 2x resolution."""
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")
    return base64.b64encode(img_bytes).decode("utf-8")


class PDFExtractor:
    """Extract text from PDF pages, using Claude Vision for scanned pages."""

    MAX_IMAGES = 10  # max page images sent to Claude per extraction call

    def extract_text(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Returns a list of page dicts:
          { page_num, text, ocr_used, image_b64, width, height }

        image_b64 is set for:
          - Pages with no/little text (clearly scanned)
          - Pages where text looks like garbled OCR
          - Always for the first 2 pages (title/header pages are often decorative)
        """
        pages = []
        doc = fitz.open(pdf_path)
        total_pages = doc.page_count

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            rect = page.rect

            # Determine if this page needs a Vision image
            needs_image = (
                page_num <= 2              # always render cover/title pages
                or len(text) == 0          # blank — definitely scanned
                or _is_garbage_ocr(text)   # has text but it's garbled OCR
            )

            image_b64 = _render_page_image(page) if needs_image else None
            ocr_used = needs_image

            pages.append({
                "page_num": page_num,
                "text": text,
                "ocr_used": ocr_used,
                "image_b64": image_b64,
                "width": rect.width,
                "height": rect.height,
            })

        doc.close()
        return pages

    def get_page_count(self, pdf_path: str) -> int:
        doc = fitz.open(pdf_path)
        count = doc.page_count
        doc.close()
        return count

    async def suggest_columns(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Use Claude to suggest column names from a sample PDF.
        Sends images for scanned pages, text for native PDFs.
        Returns list of {name, description, data_type, extraction_hint}.
        """
        loop = asyncio.get_event_loop()
        pages = await loop.run_in_executor(None, self.extract_text, pdf_path)
        if not pages:
            return []

        sample_text = "\n".join(p["text"] for p in pages[:5] if p["text"])[:6000]
        page_images = [p["image_b64"] for p in pages[:5] if p.get("image_b64")]

        from app.services.llm.claude_service import ClaudeService
        llm = ClaudeService()
        return await llm.suggest_columns(sample_text, page_images=page_images or None)

    def full_text(self, pdf_path: str) -> str:
        """Return all page text concatenated."""
        pages = self.extract_text(pdf_path)
        return "\n\n--- PAGE BREAK ---\n\n".join(p["text"] for p in pages)
