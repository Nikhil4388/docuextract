"""
Regression test: SQLAlchemy text() bind-param parsing in analytics SQL.

THE BUG THIS PINS: `:param::type` cast syntax inside text() silently mangles
the bind parameter name (`:user_id::uuid` parses as param "user_i"), which
made every analytics INSERT raise — swallowed by the never-fail handler —
so zero events were ever recorded while the endpoint returned 204.

Rule: always use CAST(:param AS type), never `:param::type`.
"""
import re
import pytest
from sqlalchemy import text


class TestAnalyticsInsertSQL:

    def _get_insert_sql(self):
        """Extract the INSERT statement exactly as the route builds it."""
        import inspect
        from app.api.routes import analytics
        src = inspect.getsource(analytics.track_event)
        m = re.search(r'text\("""(.*?)"""\)', src, re.DOTALL)
        assert m, "INSERT text() not found in track_event"
        return m.group(1)

    def test_insert_bind_params_parse_correctly(self):
        sql = self._get_insert_sql()
        stmt = text(sql)
        params = sorted(stmt._bindparams.keys())
        expected = sorted(["user_id", "session_id", "event_type", "page",
                           "element", "metadata", "ip_hash"])
        assert params == expected, (
            f"Bind params mangled! Got {params}, expected {expected}. "
            "Did someone reintroduce `:param::type` cast syntax? Use CAST(:param AS type)."
        )

    def test_no_double_colon_cast_after_bind_param(self):
        """Source must never contain `:word::` (bind param followed by cast)."""
        import inspect
        from app.api.routes import analytics
        src = inspect.getsource(analytics)
        # Matches :param:: but not ::type (column casts) or comments
        bad = re.findall(r"(?<![:\w]):[a-z_]+::", src)
        # Filter out occurrences inside comment lines
        bad_lines = [
            ln for ln in src.splitlines()
            if re.search(r"(?<![:\w]):[a-z_]+::", ln) and not ln.strip().startswith("#")
        ]
        assert bad_lines == [], f"Dangerous `:param::type` cast syntax found: {bad_lines}"

    def test_update_last_seen_params_parse(self):
        stmt = text("""
            UPDATE users
            SET last_seen_at = NOW()
            WHERE id = :uid
              AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '1 hour')
        """)
        assert sorted(stmt._bindparams.keys()) == ["uid"]


class TestAdminActivitySQL:

    def test_activity_query_binds_only_limit(self):
        """Column casts (ae.id::text) are safe; only :limit should bind."""
        stmt = text("""
            SELECT ae.id::text, ae.event_type, ae.page, ae.element,
                   ae.created_at, ae.user_id::text, u.email, u.full_name
            FROM analytics_events ae
            LEFT JOIN users u ON ae.user_id = u.id
            ORDER BY ae.created_at DESC
            LIMIT :limit
        """)
        assert sorted(stmt._bindparams.keys()) == ["limit"]
