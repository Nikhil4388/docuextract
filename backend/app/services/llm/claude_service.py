import json
from typing import List, Dict, Any, Optional
import anthropic
from app.core.config import settings

EXTRACTION_SYSTEM_PROMPT = """You are a precise data extraction assistant.
Extract the requested fields from the document (text or image provided).
Return ONLY valid JSON with two keys:
1. "extracted_data": {column_name: value, ...} — use null if a field cannot be found
2. "confidence_scores": {column_name: 0.0-1.0, ...} — your confidence for each field
Be as accurate as possible. For scanned/photo documents, read carefully even if blurry."""


class ClaudeService:
    def __init__(self, api_key: Optional[str] = None):
        self.client = anthropic.Anthropic(
            api_key=api_key or settings.ANTHROPIC_API_KEY
        )

    async def extract_data(
        self,
        text: str,
        columns: List[Dict[str, Any]],
        model: str = "claude-sonnet-4-6",
        page_images: Optional[List[str]] = None,  # list of base64 PNG strings
    ) -> Dict[str, Any]:
        columns_desc = json.dumps(columns, indent=2)

        # Build message content — for scanned docs send images directly to Claude Vision
        content: List[Any] = []

        if page_images:
            content.append({
                "type": "text",
                "text": f"This is a scanned document. Extract data from the images below.\n\nCOLUMNS TO EXTRACT:\n{columns_desc}\n\nReturn JSON with 'extracted_data' and 'confidence_scores'."
            })
            for img_b64 in page_images[:5]:  # max 5 pages
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    }
                })
        else:
            content.append({
                "type": "text",
                "text": f"""Extract data from the following document text.

COLUMNS TO EXTRACT:
{columns_desc}

DOCUMENT TEXT:
{text[:8000]}

Return JSON with two keys:
1. "extracted_data": {{column_name: value, ...}}
2. "confidence_scores": {{column_name: 0.0-1.0, ...}}"""
            })

        message = self.client.messages.create(
            model=model,
            max_tokens=2000,
            system=EXTRACTION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    async def suggest_columns(
        self,
        sample_text: str,
        page_images: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        system = """You are a document analysis expert. Analyze the document and suggest 8-15 specific, useful data extraction columns.

For each column return a JSON object with:
- "name": snake_case column name (e.g. "full_name", "invoice_total")
- "description": what this field represents
- "data_type": one of "text", "number", "date", "boolean"
- "extraction_hint": SPECIFIC instruction telling exactly where/how to find this value in the document (e.g. "Located at top of page after 'Employee Name:' label", "Sum of all line items in the TOTAL row at bottom of invoice")

Be specific and comprehensive. Cover ALL important fields visible in the document. Return a JSON array only — no explanation."""

        # Build content: images for scanned, text for native PDFs
        content: List[Any] = []
        if page_images:
            content.append({
                "type": "text",
                "text": "Analyze this scanned document and suggest comprehensive extraction columns. Return a JSON array only."
            })
            for img_b64 in page_images[:3]:
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/png", "data": img_b64}
                })
        else:
            content.append({
                "type": "text",
                "text": f"Analyze this document and suggest comprehensive extraction columns. Return a JSON array only.\n\nDOCUMENT:\n{sample_text[:5000]}"
            })

        message = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            system=system,
            messages=[{"role": "user", "content": content}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            result = json.loads(raw.strip())
            return result if isinstance(result, list) else []
        except Exception:
            return []
