"""
PDF text extraction — Vision-first approach.

Every page is rendered as an image and sent to Claude Vision alongside
the raw OCR text. Claude uses the images as ground truth, making extraction
accurate for all PDF types: native text, scanned, historical, handwritten,
garbled OCR, mixed documents, etc.

Images are capped at the first IMAGE_CAP pages to keep API costs reasonable
while covering the pages where key data almost always appears.
"""
import base64
import asyncio
from typing import List, Dict, Any, Optional

import fitz  # PyMuPDF


IMAGE_CAP = 15  # render images for first N pages; key data is almost always here


class PDFExtractor:
    """Extract text + page images from PDFs for Vision-first Claude extraction."""

    def extract_text(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Returns a list of page dicts:
          { page_num, text, ocr_used, image_b64, width, height }

        Every page within IMAGE_CAP gets a rendered image so Claude can
        read it accurately regardless of OCR quality.
        """
        pages = []
        doc = fitz.open(pdf_path)

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            rect = page.rect

            # Always render images for first IMAGE_CAP pages
            if page_num <= IMAGE_CAP:
                mat = fitz.Matrix(2, 2)  # 2x zoom for clarity
                pix = page.get_pixmap(matrix=mat)
                image_b64 = base64.b64encode(pix.tobytes("png")).decode("utf-8")
            else:
                image_b64 = None

            pages.append({
                "page_num": page_num,
                "text": text,
                "ocr_used": image_b64 is not None,
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
        Use Claude Vision to suggest column names from a sample PDF.
        Always sends page images so suggestions work for any PDF type.
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
