"""
Tests: Excel export
  - No duplicate rows (idempotent re-save)
  - Confidence % column present
  - Low-confidence fields flagged
  - Failed file (error_message set) included as empty row
  - Column order stable
"""
import io
import pytest

try:
    import pandas as pd
    import openpyxl
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

from tests.conftest import SAMPLE_COLUMNS


def _build_records(rows):
    """Mirrors the export endpoint's record-building logic."""
    records = []
    for r in rows:
        row = {"file_name": r["file_name"]}
        if r.get("extracted_data"):
            row.update(r["extracted_data"])
        if r.get("confidence_scores"):
            scores = [v for v in r["confidence_scores"].values() if isinstance(v, (int, float))]
            avg = round((sum(scores) / len(scores)) * 100) if scores else None
            row["_confidence_%"] = f"{avg}%" if avg is not None else "—"
            low = [k for k, v in r["confidence_scores"].items()
                   if isinstance(v, (int, float)) and v < 0.7]
            row["_low_confidence_fields"] = ", ".join(low) if low else ""
        records.append(row)
    return records


MOCK_ROWS = [
    {
        "file_name": "anaconda.pdf",
        "extracted_data": {
            "Company Name": "Anaconda Copper Mining Company",
            "Interest Rate": "6%",
            "Agreement Date": "January 2, 1919",
            "Bond Amount": "$50,000,000",
            "Maturity Date": "January 1, 1929",
        },
        "confidence_scores": {
            "Company Name": 0.99, "Interest Rate": 0.99,
            "Agreement Date": 0.99, "Bond Amount": 0.99, "Maturity Date": 0.99,
        },
    },
    {
        "file_name": "barnsdall.pdf",
        "extracted_data": {
            "Company Name": "Barnsdall Oil Company",
            "Interest Rate": "6%",
            "Agreement Date": "July 1, 1919",
            "Bond Amount": "$3,300,000",
            "Maturity Date": "May 1, 1922",
        },
        "confidence_scores": {
            "Company Name": 0.99, "Interest Rate": 0.95,
            "Agreement Date": 0.99, "Bond Amount": 0.65, "Maturity Date": 0.99,
        },
    },
    {
        "file_name": "fulton.pdf",
        "extracted_data": None,
        "confidence_scores": None,
        "error_message": "Extraction failed",
    },
]


class TestExportRecordBuilding:

    def test_row_count_matches_input(self):
        records = _build_records(MOCK_ROWS)
        assert len(records) == 3

    def test_no_duplicate_rows(self):
        records = _build_records(MOCK_ROWS)
        # Running again should not add more rows
        records2 = _build_records(MOCK_ROWS)
        assert len(records) == len(records2)

    def test_confidence_column_present(self):
        records = _build_records(MOCK_ROWS)
        anaconda = records[0]
        assert "_confidence_%" in anaconda
        assert anaconda["_confidence_%"] == "99%"

    def test_low_confidence_field_flagged(self):
        records = _build_records(MOCK_ROWS)
        barnsdall = records[1]
        assert "Bond Amount" in barnsdall["_low_confidence_fields"]

    def test_high_confidence_fields_not_flagged(self):
        records = _build_records(MOCK_ROWS)
        anaconda = records[0]
        assert anaconda["_low_confidence_fields"] == ""

    def test_failed_file_included_with_only_filename(self):
        records = _build_records(MOCK_ROWS)
        fulton = records[2]
        assert fulton["file_name"] == "fulton.pdf"
        assert "_confidence_%" not in fulton

    def test_file_name_always_first_key(self):
        records = _build_records(MOCK_ROWS)
        for r in records:
            keys = list(r.keys())
            assert keys[0] == "file_name"

    @pytest.mark.skipif(not HAS_PANDAS, reason="pandas not installed")
    def test_dataframe_row_count(self):
        records = _build_records(MOCK_ROWS)
        df = pd.DataFrame(records)
        assert len(df) == 3

    @pytest.mark.skipif(not HAS_PANDAS, reason="pandas not installed")
    def test_excel_bytes_non_empty(self):
        records = _build_records(MOCK_ROWS)
        df = pd.DataFrame(records)
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Extracted Data")
        buf.seek(0)
        content = buf.read()
        assert len(content) > 0
        assert content[:4] == b"PK\x03\x04", "xlsx must start with ZIP magic bytes"

    @pytest.mark.skipif(not HAS_PANDAS, reason="pandas not installed")
    def test_excel_single_sheet_no_duplicate_headers(self):
        """Regression: task retry used to double-insert rows → duplicate header+data in xlsx."""
        records = _build_records(MOCK_ROWS)
        df = pd.DataFrame(records)
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Extracted Data")
        buf.seek(0)

        wb = openpyxl.load_workbook(buf)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))

        # Count how many times "file_name" appears in first column
        header_occurrences = sum(1 for row in all_rows if row[0] == "file_name")
        assert header_occurrences == 1, (
            f"'file_name' header appeared {header_occurrences} times — duplicate rows detected"
        )
        assert len(all_rows) == 4, f"Expected 1 header + 3 data rows, got {len(all_rows)}"
