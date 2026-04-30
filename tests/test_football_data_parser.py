"""Offline tests for the football-data.org payload parser.

Sample structure mirrors the real /v4/competitions/{code}/matches response.
"""
from __future__ import annotations

from src.collectors.football_data import (
    parse_matches_payload,
    teams_from_matches,
)


SAMPLE_PAYLOAD = {
    "filters": {"season": "2025"},
    "matches": [
        {
            "id": 12345,
            "utcDate": "2026-04-30T19:00:00Z",
            "status": "FINISHED",
            "matchday": 33,
            "stage": "REGULAR_SEASON",
            "homeTeam": {"id": 86, "name": "Real Madrid CF"},
            "awayTeam": {"id": 81, "name": "FC Barcelona"},
            "score": {"fullTime": {"home": 2, "away": 1}},
        },
        {
            "id": 12346,
            "utcDate": "2026-05-02T16:30:00Z",
            "status": "TIMED",
            "matchday": 34,
            "stage": "REGULAR_SEASON",
            "homeTeam": {"id": 78, "name": "Club Atletico de Madrid"},
            "awayTeam": {"id": 559, "name": "Sevilla FC"},
            "score": {"fullTime": {"home": None, "away": None}},
        },
        {
            # Malformed entry: missing teams. Should be skipped without crashing.
            "id": 12347,
            "utcDate": "2026-05-03T18:00:00Z",
            "status": "TIMED",
        },
    ],
}


def test_parse_finished_and_scheduled():
    matches = parse_matches_payload(SAMPLE_PAYLOAD, "PD", 12, "La Liga")
    assert len(matches) == 2

    finished = next(m for m in matches if m.api_id == 12345)
    assert finished.status == "finished"
    assert finished.score_home == 2
    assert finished.score_away == 1
    assert finished.home_team_name == "Real Madrid CF"
    assert finished.date_iso.startswith("2026-04-30T19:00")
    assert finished.league_id == 12
    assert finished.league_name == "La Liga"

    upcoming = next(m for m in matches if m.api_id == 12346)
    assert upcoming.status == "scheduled"
    assert upcoming.score_home is None


def test_parse_handles_missing_teams_without_crashing():
    # The malformed third entry should not raise.
    matches = parse_matches_payload(SAMPLE_PAYLOAD, "PD", 12, "La Liga")
    assert all(m.api_id in (12345, 12346) for m in matches)


def test_teams_dedup_from_matches():
    matches = parse_matches_payload(SAMPLE_PAYLOAD, "PD", 12, "La Liga")
    teams = teams_from_matches(matches)
    assert len(teams) == 4
    names = sorted(t["name"] for t in teams)
    assert names == [
        "Club Atletico de Madrid",
        "FC Barcelona",
        "Real Madrid CF",
        "Sevilla FC",
    ]


def test_empty_payload_returns_empty_list():
    matches = parse_matches_payload({"matches": []}, "PD", 12, "La Liga")
    assert matches == []
