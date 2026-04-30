"""Offline tests for the FBref schedule parser using a synthetic HTML sample.

We do not exercise the network. The fixtures cover both finished games (with
score) and upcoming games (no score), and check that team/fixture IDs are
deterministic.
"""
from __future__ import annotations

from src.collectors.fbref import parse_fixtures_html, teams_from_fixtures


SAMPLE_SCHEDULE_HTML = """
<html><body>
<table id="sched_2025-2026_9_1" class="stats_table sortable">
  <thead><tr><th>Header</th></tr></thead>
  <tbody>
    <tr>
      <td data-stat="date">2026-04-30</td>
      <td data-stat="start_time">21:00</td>
      <td data-stat="home_team">Real Madrid</td>
      <td data-stat="score">2-1</td>
      <td data-stat="away_team">Barcelona</td>
      <td data-stat="venue">Santiago Bernabeu</td>
      <td data-stat="referee">Mateu Lahoz</td>
    </tr>
    <tr>
      <td data-stat="date">2026-05-02</td>
      <td data-stat="start_time">18:30</td>
      <td data-stat="home_team">Atletico Madrid</td>
      <td data-stat="score"></td>
      <td data-stat="away_team">Sevilla</td>
      <td data-stat="venue">Civitas Metropolitano</td>
      <td data-stat="referee"></td>
    </tr>
    <tr class="thead"><th>Header repeats</th></tr>
    <tr class="spacer"></tr>
  </tbody>
</table>
</body></html>
"""


def test_parses_finished_and_scheduled():
    fixtures = parse_fixtures_html(
        SAMPLE_SCHEDULE_HTML,
        league_id=12,
        league_name="La Liga",
        season="2025-2026",
    )
    assert len(fixtures) == 2

    finished = next(f for f in fixtures if f.home_team_name == "Real Madrid")
    assert finished.status == "finished"
    assert finished.score_home == 2
    assert finished.score_away == 1
    assert finished.date_iso.startswith("2026-04-30T21:00")
    assert finished.venue == "Santiago Bernabeu"
    assert finished.referee == "Mateu Lahoz"

    upcoming = next(f for f in fixtures if f.home_team_name == "Atletico Madrid")
    assert upcoming.status == "scheduled"
    assert upcoming.score_home is None
    assert upcoming.score_away is None


def test_team_dedup_from_fixtures():
    fixtures = parse_fixtures_html(
        SAMPLE_SCHEDULE_HTML,
        league_id=12,
        league_name="La Liga",
        season="2025-2026",
    )
    teams = teams_from_fixtures(fixtures)
    names = sorted(t["name"] for t in teams)
    assert names == ["Atletico Madrid", "Barcelona", "Real Madrid", "Sevilla"]
    # api_id present and unique
    ids = [t["api_id"] for t in teams]
    assert len(ids) == len(set(ids))


def test_handles_empty_html_gracefully():
    fixtures = parse_fixtures_html(
        "<html><body></body></html>",
        league_id=12,
        league_name="La Liga",
        season="2025-2026",
    )
    assert fixtures == []
