"""
Tests: Results display logic (mirrors frontend dynamicColumns + rows logic)

Cases:
  - Failed row first (null extracted_data) → columns derived from next valid row
  - All rows have data → first row used for columns
  - All rows all-null values → columns still built from keys (values null but keys exist)
  - rows array built correctly from results
"""
import pytest
from typing import Optional


def resolve_column_keys(results: list[dict]) -> list[str]:
    """
    Mirrors the fixed frontend dynamicColumns logic:
      find first result with non-empty extracted_data, fall back to results[0].
    """
    first = next(
        (r for r in results if r.get("extracted_data") and len(r["extracted_data"]) > 0),
        results[0] if results else None
    )
    if not first:
        return []
    return list((first.get("extracted_data") or {}).keys())


def build_rows(results: list[dict]) -> list[dict]:
    """Mirrors: rows = results?.map((r) => ({ id: r.id, ...r })) ?? []"""
    return [{"id": r["id"], **r} for r in results]


GOOD_DATA = {
    "Company Name": "Anaconda Copper Mining Company",
    "Interest Rate": "6%",
    "Agreement Date": "January 2, 1919",
}


class TestDynamicColumns:

    def test_first_valid_row_used_when_first_row_is_failed(self):
        results = [
            {"id": "1", "file_name": "failed.pdf", "extracted_data": None},
            {"id": "2", "file_name": "good.pdf",   "extracted_data": GOOD_DATA},
        ]
        keys = resolve_column_keys(results)
        assert keys == list(GOOD_DATA.keys()), \
            "Should skip failed row and use second row for column keys"

    def test_first_row_with_data_used(self):
        results = [
            {"id": "1", "file_name": "a.pdf", "extracted_data": GOOD_DATA},
            {"id": "2", "file_name": "b.pdf", "extracted_data": {"Company Name": "Other Co"}},
        ]
        keys = resolve_column_keys(results)
        assert keys == list(GOOD_DATA.keys())

    def test_all_null_values_still_generates_columns(self):
        """
        Even if all extracted values are null, the keys exist —
        columns must still be built so the DataGrid has columns to show.
        """
        all_null_data = {"Company Name": None, "Interest Rate": None, "Agreement Date": None}
        results = [
            {"id": "1", "file_name": "fulton.pdf", "extracted_data": all_null_data},
        ]
        keys = resolve_column_keys(results)
        assert keys == list(all_null_data.keys()), \
            "Keys must be returned even when all values are None"

    def test_empty_results_returns_empty_columns(self):
        assert resolve_column_keys([]) == []

    def test_all_failed_rows_falls_back_to_first(self):
        results = [
            {"id": "1", "file_name": "a.pdf", "extracted_data": None},
            {"id": "2", "file_name": "b.pdf", "extracted_data": None},
        ]
        keys = resolve_column_keys(results)
        assert keys == []  # no valid row → empty

    def test_3_of_3_processed_shows_all_rows(self):
        results = [
            {"id": "1", "file_name": "a.pdf", "extracted_data": GOOD_DATA},
            {"id": "2", "file_name": "b.pdf", "extracted_data": GOOD_DATA},
            {"id": "3", "file_name": "c.pdf", "extracted_data": GOOD_DATA},
        ]
        rows = build_rows(results)
        assert len(rows) == 3

    def test_rows_have_id_field(self):
        results = [{"id": "abc-123", "file_name": "x.pdf", "extracted_data": GOOD_DATA}]
        rows = build_rows(results)
        assert rows[0]["id"] == "abc-123"

    def test_2_processed_1_failed_shows_3_rows(self):
        """All 3 rows (including the failed one) should appear in the DataGrid."""
        results = [
            {"id": "1", "file_name": "good1.pdf", "extracted_data": GOOD_DATA},
            {"id": "2", "file_name": "good2.pdf", "extracted_data": GOOD_DATA},
            {"id": "3", "file_name": "bad.pdf",   "extracted_data": None, "error_message": "Failed"},
        ]
        rows = build_rows(results)
        assert len(rows) == 3, "Failed rows must still appear in the table"

        # Columns derived from first valid row (row 0)
        keys = resolve_column_keys(results)
        assert keys == list(GOOD_DATA.keys())


class TestResultsQueryTrigger:
    """Document the conditions under which the results query should fire."""

    @pytest.mark.parametrize("status,should_fetch", [
        ("completed", True),
        ("failed",    True),
        ("processing", False),
        ("pending",   False),
        ("cancelled", False),
    ])
    def test_results_query_enabled_condition(self, status, should_fetch):
        enabled = status in ("completed", "failed")
        assert enabled == should_fetch

    def test_refetch_when_job_becomes_completed(self):
        """
        queryKey includes job.status so when status transitions to 'completed'
        the key changes and React Query fires a new fetch.
        """
        old_key = ("job-results", "job-123", "", "processing")
        new_key = ("job-results", "job-123", "", "completed")
        assert old_key != new_key, "Key must change on status transition"

    def test_retry_interval_active_when_zero_results(self):
        """If job is done but results is empty, refetchInterval returns 2000ms."""
        def refetch_interval(results_length: int, job_done: bool) -> int | bool:
            if job_done and results_length == 0:
                return 2000
            return False

        assert refetch_interval(0, True)  == 2000
        assert refetch_interval(3, True)  == False
        assert refetch_interval(0, False) == False
