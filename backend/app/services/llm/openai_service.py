"""
OpenAI LLM service for structured data extraction.
"""
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

from app.core.config import settings


class OpenAIService:
    def __init__(self, api_key: Optional[str] = None):
        self.client = AsyncOpenAI(api_key=api_key or settings.OPENAI_API_KEY)

    async def extract_data(
        self,
        text: str,
        columns: List[Dict[str, Any]],
        model: str = "gpt-4o-mini",
    ) -> Dict[str, Any]:
        columns_desc = json.dumps(columns, indent=2)
        prompt = f"""Extract structured data from the document.

COLUMNS:
{columns_desc}

TEXT:
{text[:8000]}

Return JSON with:
1. "extracted_data": {{column_name: value}}
2. "confidence_scores": {{column_name: 0.0-1.0}}"""

        response = await self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a precise data extraction assistant. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_tokens=2000,
        )
        return json.loads(response.choices[0].message.content)

    async def suggest_columns(self, sample_text: str) -> List[Dict[str, Any]]:
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a document analysis assistant. Return valid JSON only."},
                {"role": "user", "content": f"Suggest data extraction columns for this document. Return a JSON array of {{name, description, data_type, extraction_hint}}:\n\n{sample_text[:4000]}"},
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
        )
        result = json.loads(response.choices[0].message.content)
        return result if isinstance(result, list) else result.get("columns", [])


def get_llm_service(provider: str, api_key: Optional[str] = None):
    """Factory for LLM services."""
    if provider == "openai":
        return OpenAIService(api_key=api_key)
    from app.services.llm.claude_service import ClaudeService
    return ClaudeService(api_key=api_key)
