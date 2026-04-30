"""Offline tests for the Understat parser using the same JS-encoded format
the site embeds in real pages.
"""
from __future__ import annotations

from src.collectors.understat import (
    extract_js_var,
    fixture_stats_rows,
    parse_league_matches,
)


def _build_html(payload: str) -> str:
    return f"""
<html><body>
<script>
    var datesData = JSON.parse('{payload}');
</script>
</body></html>
"""


# Two matches: one finished with xG, one upcoming.
# JSON.parse expects a string literal with \xHH escapes for special chars.
RAW_PAYLOAD = (
    "[{\\\"id\\\":\\\"123\\\",\\\"isResult\\\":true,"
    "\\\"h\\\":{\\\"id\\\":\\\"1\\\",\\\"title\\\":\\\"Real Madrid\\\","
    "\\\"short_title\\\":\\\"RMA\\\"},"
    "\\\"a\\\":{\\\"id\\\":\\\"2\\\",\\\"title\\\":\\\"Barcelona\\\","
    "\\\"short_title\\\":\\\"BAR\\\"},"
    "\\\"goals\\\":{\\\"h\\\":\\\"2\\\",\\\"a\\\":\\\"1\\\"},"
    "\\\"xG\\\":{\\\"h\\\":\\\"1.85\\\",\\\"a\\\":\\\"1.42\\\"},"
    "\\\"datetime\\\":\\\"2026-04-30 21:00:00\\\"},"
    "{\\\"id\\\":\\\"124\\\",\\\"isResult\\\":false,"
    "\\\"h\\\":{\\\"id\\\":\\\"3\\\",\\\"title\\\":\\\"Atletico Madrid\\\","
    "\\\"short_title\\\":\\\"ATM\\\"},"
    "\\\"a\\\":{\\\"id\\\":\\\"4\\\",\\\"title\\\":\\\"Sevilla\\\","
    "\\\"short_title\\\":\\\"SEV\\\"},"
    "\\\"goals\\\":{\\\"h\\\":null,\\\"a\\\":null},"
    "\\\"xG\\\":{\\\"h\\\":null,\\\"a\\\":null},"
    "\\\"datetime\\\":\\\"2026-05-02 18:30:00\\\"}]"
)


def test_extract_js_var_returns_list():
    html = _build_html(RAW_PAYLOAD)
    data = extract_js_var(html, "datesData")
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["h"]["title"] == "Real Madrid"


def test_parse_league_matches_extracts_xg_and_status():
    html = _build_html(RAW_PAYLOAD)
    matches = parse_league_matches(html, "La_liga", "La Liga")
    assert len(matches) == 2

    finished = next(m for m in matches if m.home_team == "Real Madrid")
    assert finished.is_finished
    assert finished.home_xg == 1.85
    assert finished.away_xg == 1.42
    assert finished.home_goals == 2
    assert finished.away_goals == 1

    upcoming = next(m for m in matches if m.home_team == "Atletico Madrid")
    assert not upcoming.is_finished
    assert upcoming.home_xg is None


def test_fixture_stats_rows_skips_unfinished():
    html = _build_html(RAW_PAYLOAD)
    matches = parse_league_matches(html, "La_liga", "La Liga")
    rows = fixture_stats_rows(matches)
    assert len(rows) == 1
    assert rows[0]["xg_home"] == 1.85
    assert rows[0]["xg_away"] == 1.42


def test_parse_returns_empty_when_var_missing():
    matches = parse_league_matches("<html></html>", "EPL", "Premier League")
    assert matches == []
