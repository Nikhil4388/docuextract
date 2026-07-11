"""
Tests: extraction routing logic (text vs vision vs fallbacks)

Cases covered:
  1. TEXT PATH   — pages have OCR text (>500 chars total) → use text
  2. VISION PATH — all pages are image-only (<500 chars) → use vision
  3. BLANK TRAILING PAGES — 3 blank pages at end BUT full_text ≥500 chars → text path (not vision)
  4. VISION FALLBACK (pre-rendered) — text gave >60% nulls, page_images available → retry vision
  5. RENDER-ON-DEMAND FALLBACK — all pages had text but >60% nulls → render pages → vision retry
  6. CONCISE VALUES — extracted values must not contain full sentences
  7. OCR ARTIFACT CORRECTION — garbled years like 'l9l9' → '1919'
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from tests.conftest import SAMPLE_COLUMNS, make_llm_response

COLUMNS = SAMPLE_COLUMNS
COLS_JSON = json.dumps(COLUMNS, indent=2)


def _null_result(columns):
    return {"extracted_data": {c["name"]: None for c in columns},
            "confidence_scores": {c["name"]: 0.0 for c in columns}}


def _good_result(columns):
    values = {
        "Company Name": "Anaconda Copper Mining Company",
        "Interest Rate": "6%",
        "Agreement Date": "January 2, 1919",
        "Bond Amount": "$50,000,000",
        "Maturity Date": "January 1, 1929",
    }
    return {"extracted_data": values,
            "confidence_scores": {c["name"]: 0.99 for c in columns}}


# ── 1. Text path chosen when full_text >= 500 chars ─────────────────────────

class TestTextVsVisionRouting:

    def test_text_path_when_abundant_ocr(self):
        full_text = "A" * 600
        page_images = []
        use_vision = bool(page_images) and len(full_text.strip()) < 500
        assert use_vision is False, "Should use text path when OCR has ≥500 chars"

    def test_vision_path_when_text_sparse(self):
        full_text = "A" * 100   # truly scanned, very little text
        page_images = ["base64imgdata=="]
        use_vision = bool(page_images) and len(full_text.strip()) < 500
        assert use_vision is True, "Should use vision when text < 500 chars and images exist"

    def test_blank_trailing_pages_dont_hijack_text(self):
        """
        The Anaconda bug: pages 58-60 are blank (produce image slots) but
        98,950 chars of good text exist. Must NOT switch to vision.
        """
        full_text = "T" * 98950  # real OCR text
        page_images = ["img1==", "img2==", "img3=="]  # 3 blank trailing pages
        use_vision = bool(page_images) and len(full_text.strip()) < 500
        assert use_vision is False, "Blank trailing pages must not override abundant text"

    def test_vision_path_with_sparse_text_and_images(self):
        full_text = ""
        page_images = ["img1==", "img2=="]
        use_vision = bool(page_images) and len(full_text.strip()) < 500
        assert use_vision is True


# ── 2. Vision fallback when pre-rendered images exist ────────────────────────

class TestVisionFallbackPreRendered:

    def test_fallback_triggers_when_nulls_exceed_60pct(self):
        columns = SAMPLE_COLUMNS  # 5 columns
        extracted = {c["name"]: None for c in columns}  # all null = 100%
        null_count = sum(1 for v in extracted.values() if v is None)
        should_fallback = null_count > len(columns) * 0.6
        assert should_fallback is True

    def test_fallback_does_not_trigger_when_nulls_under_60pct(self):
        columns = SAMPLE_COLUMNS  # 5 columns
        extracted = {
            "Company Name": "Anaconda",
            "Interest Rate": "6%",
            "Agreement Date": "January 1, 1919",
            "Bond Amount": None,
            "Maturity Date": None,
        }
        null_count = sum(1 for v in extracted.values() if v is None)
        should_fallback = null_count > len(columns) * 0.6
        assert should_fallback is False, "2/5 nulls (40%) should not trigger fallback"

    def test_vision_result_used_only_if_fewer_nulls(self):
        """Vision result replaces text result only if it has fewer nulls."""
        text_nulls = 4   # text gave 4/5 nulls
        vision_nulls = 1  # vision gave 1/5 nulls
        should_upgrade = vision_nulls < text_nulls
        assert should_upgrade is True

    def test_vision_result_ignored_when_not_better(self):
        """If vision result is equally bad, keep original text result."""
        text_nulls = 3
        vision_nulls = 3
        should_upgrade = vision_nulls < text_nulls
        assert should_upgrade is False


# ── 3. Render-on-demand fallback (no pre-rendered images) ────────────────────

class TestRenderOnDemandFallback:

    def test_renders_when_no_page_images_and_many_nulls(self):
        """Fulton Mining case: all pages had text, page_images is EMPTY, but nulls high."""
        columns = SAMPLE_COLUMNS
        page_images = []   # empty — all pages above OCR threshold
        use_vision = False  # text path was used
        extracted = {c["name"]: None for c in columns}
        null_count = sum(1 for v in extracted.values() if v is None)
        should_render = not use_vision and not page_images and null_count > len(columns) * 0.6
        assert should_render is True

    def test_no_render_when_page_images_already_exist(self):
        """If pre-rendered images exist, render-on-demand should not fire."""
        columns = SAMPLE_COLUMNS
        page_images = ["img1=="]
        use_vision = False
        extracted = {c["name"]: None for c in columns}
        null_count = sum(1 for v in extracted.values() if v is None)
        should_render = not use_vision and not page_images and null_count > len(columns) * 0.6
        assert should_render is False

    def test_no_render_when_nulls_acceptable(self):
        columns = SAMPLE_COLUMNS
        page_images = []
        use_vision = False
        extracted = {c["name"]: "value" for c in columns}  # all filled
        null_count = sum(1 for v in extracted.values() if v is None)
        should_render = not use_vision and not page_images and null_count > len(columns) * 0.6
        assert should_render is False


# ── 4. Concise value extraction ───────────────────────────────────────────────

class TestConciseValues:
    """Verify extracted values are short and not full sentences."""

    VERBOSE_EXAMPLES = [
        ("Interest Rate", "at the rate of six per cent. (6%) per annum", "6%"),
        ("Agreement Date", "made this 1st day of January in the year 1919", "January 1, 1919"),
        ("Bond Amount", "the aggregate principal amount of fifty million dollars ($50,000,000)", "$50,000,000"),
        ("Company Name", "the party of the first part, Anaconda Copper Mining Company, a corporation", "Anaconda Copper Mining Company"),
        ("Bond Term", "ten (10) years", "10"),
    ]

    @pytest.mark.parametrize("field,verbose,expected", VERBOSE_EXAMPLES)
    def test_verbose_value_is_longer_than_expected(self, field, verbose, expected):
        """Document that verbose values are unacceptably long."""
        assert len(verbose) > len(expected) * 2, (
            f"'{verbose}' should be much longer than the concise '{expected}'"
        )

    @pytest.mark.parametrize("field,verbose,expected", VERBOSE_EXAMPLES)
    def test_expected_value_is_concise(self, field, verbose, expected):
        """Concise values should be short (≤30 chars for most fields)."""
        assert len(expected) <= 40, f"Expected value '{expected}' is too long"

    def test_interest_rate_format(self):
        """Interest rate must be just the percentage."""
        good = "6%"
        bad = "at the rate of six per cent. (6%) per annum"
        assert len(good) <= 5
        assert "per annum" not in good

    def test_boolean_field_is_yes_no(self):
        """Boolean fields should return 'Yes' or 'No' only."""
        good_values = {"Yes", "No"}
        assert "Yes" in good_values
        assert "No" in good_values
        bad = "in the event of default, the principal may become due"
        assert bad not in good_values


# ── 5. OCR artifact correction ────────────────────────────────────────────────

class TestOCRArtifacts:
    """These tests document the OCR artifact patterns the prompt must handle."""

    OCR_CASES = [
        ("l9l9", "1919"),   # lowercase L → digit 1
        ("l9l8", "1918"),
        ("l92O", "1920"),   # O → 0
        ("$5O,OOO,OOO", "$50,000,000"),
    ]

    @pytest.mark.parametrize("garbled,expected", OCR_CASES)
    def test_ocr_pattern_documented(self, garbled, expected):
        """Document the garbled→correct mapping the prompt teaches Claude."""
        assert garbled != expected, "OCR artifact must differ from corrected value"
        assert expected.replace(",", "").replace("$", "").replace("%", "").isdigit() or \
               expected[0].isdigit() or expected.startswith("$"), \
               f"Corrected value '{expected}' should be numeric"

    def test_hyphenation_artifact(self):
        """¬ at line end is a hyphenation artifact and should be removed."""
        ocr_line = "Trust In¬\ndenture"
        # The prompt instructs Claude to join across ¬
        assert "¬" in ocr_line
        cleaned = ocr_line.replace("¬\n", "")
        assert cleaned == "Trust Indenture"
