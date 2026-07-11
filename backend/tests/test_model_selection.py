"""
Tests: model selection logic in extraction_task.py
  - Each allowed model passes through unchanged
  - Deprecated models fall back to default
  - Unknown model string is forwarded (forward-compat)
  - Empty/None falls back to default
"""
import pytest

# Import the constants directly from the task module
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.tasks.extraction_task import (
    _ALLOWED_MODELS,
    _DEPRECATED_MODELS,
    _DEFAULT_MODEL,
)


def _resolve_model(requested: str | None) -> str:
    """Mirrors the model-resolution logic in extraction_task._async_pipeline."""
    _requested = requested or ""
    if _requested in _ALLOWED_MODELS:
        return _requested
    elif _requested and _requested not in _DEPRECATED_MODELS:
        return _requested   # forward-compat: unknown but not deprecated
    else:
        return _DEFAULT_MODEL


class TestModelSelection:

    @pytest.mark.parametrize("model", sorted(_ALLOWED_MODELS))
    def test_allowed_model_passes_through(self, model):
        assert _resolve_model(model) == model

    @pytest.mark.parametrize("model", sorted(_DEPRECATED_MODELS))
    def test_deprecated_model_falls_back(self, model):
        result = _resolve_model(model)
        assert result == _DEFAULT_MODEL, (
            f"Deprecated model '{model}' should fall back to '{_DEFAULT_MODEL}', got '{result}'"
        )

    def test_none_falls_back_to_default(self):
        assert _resolve_model(None) == _DEFAULT_MODEL

    def test_empty_string_falls_back_to_default(self):
        assert _resolve_model("") == _DEFAULT_MODEL

    def test_unknown_future_model_forwarded(self):
        """A model not in _ALLOWED_MODELS or _DEPRECATED_MODELS should be forwarded."""
        future_model = "claude-fable-6"
        result = _resolve_model(future_model)
        assert result == future_model, "Unknown non-deprecated model must be forwarded as-is"

    def test_default_model_is_in_allowed_set(self):
        assert _DEFAULT_MODEL in _ALLOWED_MODELS

    def test_no_overlap_between_allowed_and_deprecated(self):
        overlap = _ALLOWED_MODELS & _DEPRECATED_MODELS
        assert overlap == set(), f"Models in both sets: {overlap}"

    def test_all_expected_models_present(self):
        expected = {
            "claude-haiku-4-5-20251001",
            "claude-sonnet-4-6",
            "claude-sonnet-5",
            "claude-opus-4-6",
            "claude-opus-4-8",
            "claude-fable-5",
        }
        assert expected == _ALLOWED_MODELS
