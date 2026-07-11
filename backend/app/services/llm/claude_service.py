import json
from typing import List, Dict, Any, Optional
import anthropic
from app.core.config import settings

EXTRACTION_SYSTEM_PROMPT = """You are an expert data extraction specialist for historical legal and financial documents (1880s–1940s).

These documents often have OCR scanning artifacts — READ THROUGH THEM:
• "l9l9", "l9l8", "l92O" etc. = 1919, 1918, 1920 (lowercase L mistaken for digit 1, O for 0)
• "¬" at line end = hyphenation artifact, ignore and join the word across lines
• Garbled uppercase runs (e.g. "AgrPPttttfttt") = OCR error for "Agreement" — use context
• "$5O,OOO,OOO" → $50,000,000 (O vs 0 confusion)

VALUE FORMAT — CRITICAL:
Extract ONLY the essential value. NEVER copy surrounding sentence text.
• Interest rate → "6%" not "at the rate of six per cent. (6%) per annum"
• Date → "January 1, 1919" not "made this 1st day of January in the year 1919"
• Amount → "$50,000,000" not "the aggregate principal amount of fifty million dollars ($50,000,000)"
• Company name → "Anaconda Copper Mining Company" not "the party of the first part, Anaconda Copper Mining Company, a corporation"
• State → "Montana" not "incorporated under the laws of the State of Montana"
• Yes/No fields → "Yes" or "No" only
• Numbers → digits only, e.g. "10" not "ten (10) years"

EXTRACTION RULES:
1. Return ONLY valid JSON: {"extracted_data": {...}, "confidence_scores": {...}}
2. For fields with multiple values (serial maturity dates, multiple parties), join with " / "
3. If a value has OCR noise but is CLEARLY inferable from context, extract it — score 0.85-0.94
4. Use null ONLY if the field is genuinely absent from the entire document
5. Score 0.97-1.0 for clean values; 0.85-0.96 for OCR-inferred but confident values
6. Most fields in structured legal documents ARE present — search before returning null."""


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

        # Build message content.
        # Use Vision ONLY when text is truly sparse — PDFs with blank trailing pages
        # produce image slots but have abundant OCR text; discarding that text causes
        # all-null results. Prefer text whenever ≥500 chars are available.
        content: List[Any] = []
        use_vision = bool(page_images) and len(text.strip()) < 500

        if use_vision:
            content.append({
                "type": "text",
                "text": f"This is a scanned document. Extract data from the images below.\n\nCOLUMNS TO EXTRACT:\n{columns_desc}\n\nReturn JSON with 'extracted_data' and 'confidence_scores'. Score 0.97+ for any value you can clearly read."
            })
            for img_b64 in page_images[:10]:  # max 10 pages
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
                "text": f"""Extract data from this historical legal document.
OCR artifacts to ignore: 'l9l9'=1919, '¬'=hyphen, garbled words = OCR errors for common terms.

COLUMNS TO EXTRACT:
{columns_desc}

DOCUMENT TEXT:
{text[:20000]}

Return JSON with two keys:
1. "extracted_data": {{column_name: value, ...}}
2. "confidence_scores": {{column_name: 0.0-1.0, ...}}"""
            })

        message = self.client.messages.create(
            model=model,
            max_tokens=4096,
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
        system = """You are an expert business document analyst. Your job is to suggest the most valuable data extraction columns for a spreadsheet.

STEP 1 — IDENTIFY THE DOCUMENT TYPE:
Determine what kind of document this is (Invoice, Contract, Trust Indenture, Insurance Policy, Employment Agreement, Purchase Order, Medical Record, etc.).

STEP 2 — SELECT ONLY BUSINESS-CRITICAL FIELDS:
Choose 6–14 fields that a business analyst, accountant, lawyer, or manager would actually need in a spreadsheet for reporting, auditing, or decision-making.

SKIP these — they have no analytical value:
• Boilerplate legal recitals and "WHEREAS" clauses
• Signature lines, witness names, notary seals
• Page numbers, exhibit labels, section headings
• Redundant fields that duplicate other columns
• Administrative metadata of no business use

STEP 3 — FORMAT RULES (strictly follow):
• "name": Human-readable Title Case WITH spaces. Examples: "Company Name", "Invoice Total", "Agreement Date", "Bond Interest Rate". NEVER use snake_case or all-caps.
• "description": One concise sentence explaining what this field means.
• "data_type": Exactly one of "text", "number", "date", "boolean".
• "extraction_hint": Precise location — WHERE in the document to find this value. Example: "First page after 'BETWEEN' keyword, before 'and' conjunction", "Labeled 'Total Amount Due' in the bottom-right of the itemized fee table", "Stated as 'dated the ___ day of ___' in the opening paragraph".

Return ONLY a valid JSON array. No markdown, no explanation, no wrapping object."""

        # Build content: images for scanned, text for native PDFs
        content: List[Any] = []
        if page_images:
            content.append({
                "type": "text",
                "text": (
                    "Analyze this scanned document and suggest the most business-valuable extraction columns.\n"
                    "Focus on fields a business analyst or manager would need in a spreadsheet.\n"
                    "Return a JSON array only — no markdown, no explanation."
                )
            })
            for img_b64 in page_images[:5]:
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/png", "data": img_b64}
                })
        else:
            content.append({
                "type": "text",
                "text": (
                    f"Analyze this document and suggest the most business-valuable extraction columns.\n"
                    f"Focus on fields a business analyst or manager would need in a spreadsheet.\n"
                    f"Return a JSON array only — no markdown, no explanation.\n\n"
                    f"DOCUMENT:\n{sample_text[:6000]}"
                )
            })

        message = self.client.messages.create(
            model="claude-sonnet-5",  # Best column suggestions
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
