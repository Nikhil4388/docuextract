"""
PDF text extraction with OCR fallback.
Uses PyMuPDF for native text and Tesseract for scanned pages.
"""
import os
import io
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image
import pytesseract


class PDFExtractor:
    """Extract text from PDF pages, using OCR for scanned pages."""

    OCR_THRESHOLD = 50  # chars per page; below this, assume scanned

    def extract_text(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Returns a list of page dicts:
          { page_num, text, ocr_used, width, height }
        """
        pages = []
        doc = fitz.open(pdf_path)
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            ocr_used = False
            if len(text) < self.OCR_THRESHOLD:
                text = self._ocr_page(page)
                ocr_used = True
            rect = page.rect
            pages.append({
                "page_num": page_num,
                "text": text,
                "ocr_used": ocr_used,
                "width": rect.width,
                "height": rect.height,
            })
        doc.close()
        return pages

    def _ocr_page(self, page: fitz.Page) -> str:
        """Render a PDF page to image and run Tesseract OCR."""
        mat = fitz.Matrix(2, 2)  # 2x zoom for better OCR
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        return pytesseract.image_to_string(img, config="--oem 3 --psm 6")

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
