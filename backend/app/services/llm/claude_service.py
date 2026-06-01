import json
from typing import List, Dict, Any, Optional
import anthropic
from app.core.config import settings

EXTRACTION_SYSTEM_PROMPT = """You are a precise data extraction assistant.
Given text extracted from a PDF and a list of column definitions, extract the requested
data fields. Return a valid JSON object where keys are the column names.
If a value cannot be found, use null.
Include a confidence_scores object (0.0-1.0) for each field."""

class ClaudeService:
    def __init__(self, api_key: Optional[str] = None):
        self.client = anthropic.Anthropic(
            api_key=api_key or settings.ANTHROPIC_API_KEY
        )

    async def extract_data(self, text: str, columns: List[Dict[str, Any]], model: str = "claude-haiku-4-5-20251001") -> Dict[str, Any]:
        columns_desc = json.dumps(columns, indent=2)
        user_prompt = f"""Extract data from the following document text.

COLUMNS TO EXTRACT:
{columns_desc}

DOCUMENT TEXT:
{text[:8000]}

Return JSON with two keys:
1. "extracted_data": {{column_name: value, ...}}
2. "confidence_scores": {{column_name: 0.0-1.0, ...}}"""

        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system=EXTRACTION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content = message.content[0].text.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())

    async def suggest_columns(self, sample_text: str) -> List[Dict[str, Any]]:
        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system="You are a document analysis assistant. Return a JSON array of objects with fields: name, description, data_type (text|number|date|boolean), extraction_hint.",
            messages=[{"role": "user", "content": f"Suggest data extraction columns for this document. Return a JSON array only:\n\n{sample_text[:4000]}"}],
        )
        content = message.content[0].text.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        try:
            return json.loads(content.strip())
        except:
            return []
