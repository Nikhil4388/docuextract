"""
PDF text extraction.
- Native text PDFs: PyMuPDF direct text extraction
- Scanned/photo PDFs: page rendered as image and sent to Claude Vision
  (much more accurate than Tesseract for blurry/rotated/handwritten docs)
"""
import os
import io
import base64
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path

import fitz  # PyMuPDF


class PDFExtractor:
    """Extract text from PDF pages, using Claude Vision for scanned pages."""

    OCR_THRESHOLD = 50  # chars per page; below this, treat as scanned image

    def extract_text(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Returns a list of page dicts:
          { page_num, text, ocr_used, image_b64 (only for scanned pages), width, height }
        """
        pages = []
        doc = fitz.open(pdf_path)
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            ocr_used = False
            image_b64 = None
            rect = page.rect

            if len(text) < self.OCR_THRESHOLD:
                # Scanned page — render to image for Claude Vision
                mat = fitz.Matrix(2, 2)  # 2x zoom for clarity
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                image_b64 = base64.b64encode(img_bytes).decode("utf-8")
                ocr_used = True

            pages.append({
                "page_num": page_num,
                "text": text,
                "ocr_used": ocr_used,
                "image_b64": image_b64,  # None for native-text pages
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
        Use LLM to suggest column names from first page of a sample PDF.
        Returns list of {name, description, data_type, extraction_hint}.
        """
        loop = asyncio.get_event_loop()
        pages = await loop.run_in_executor(None, self.extract_text, pdf_path)
        if not pages:
            return []

        sample_text = "\n".join(p["text"] for p in pages[:2])[:3000]

        from app.services.llm.claude_service import ClaudeService
        llm = ClaudeService()
        return await llm.suggest_columns(sample_text)

    def full_text(self, pdf_path: str) -> str:
        """Return all page text concatenated."""
        pages = self.extract_text(pdf_path)
        return "\n\n--- PAGE BREAK ---\n\n".join(p["text"] for p in pages)
