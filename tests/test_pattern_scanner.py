"""Pattern scanner tests — strict mode (9/10 form, 5/5 H2H mandatory)."""
from src.analyzer.match_context import HeadToHead, MatchContext, TeamForm
from src.analyzer.pattern_scanner import (
    LAST_N,
    REQUIRED_H2H,
    attach_odds,
    scan_patterns,
)
from src.models.value_detector import MarketQuote


def _form(goals_for=None, goals_against=None, last_results=None, matches=LAST_N):
    return TeamForm(
        team_api_id=0,
        matches_considered=matches,
        last_results=last_results or [],
        streak=0,
        goals_for=goals_for or [],
        goals_against=goals_against or [],
        xg_for=[],
        xg_against=[],
    )


def _ctx(home_form, away_form, h2h_fixtures=None):
    fixture = {
        "api_id": 1,
        "league_name": "La Liga",
        "home_team_api_id": 1,
        "away_team_api_id": 2,
        "home_team_name": "Real Madrid",
        "away_team_name": "Barcelona",
    }
    return MatchContext(
        fixture=fixture,
        home_form=home_form,
        away_form=away_form,
        h2h=HeadToHead(team_a_id=1, team_b_id=2, fixtures=h2h_fixtures or []),
    )


def _btts_fixture(score_h, score_a, home_id=1, away_id=2):
    return {
        "home_team_api_id": home_id,
        "away_team_api_id": away_id,
        "score_home": score_h,
        "score_away": score_a,
    }


def test_btts_yes_pattern_requires_perfect_h2h():
    home = _form(goals_for=[1] * 10, goals_against=[1] * 10)  # 10/10 BTTS
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)  # 10/10 BTTS
    h2h = [_btts_fixture(1, 1)] * 5                            # 5/5 BTTS
    ctx = _ctx(home, away, h2h)
    picks = [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"]
    assert len(picks) == 1


def test_btts_yes_skipped_when_h2h_only_4_of_5():
    home = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 4 + [_btts_fixture(1, 0)]   # 4/5 BTTS — fails strict
    ctx = _ctx(home, away, h2h)
    picks = [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"]
    assert picks == []


def test_btts_yes_skipped_when_h2h_only_4_matches():
    home = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 4   # only 4 H2H matches — below REQUIRED_H2H=5
    assert REQUIRED_H2H == 5
    ctx = _ctx(home, away, h2h)
    picks = [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"]
    assert picks == []


def test_form_below_9_of_10_skipped():
    # 8/10 BTTS for home — below 9/10 strict threshold
    home = _form(
        goals_for=[1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        goals_against=[1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    )
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 5
    ctx = _ctx(home, away, h2h)
    assert [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"] == []


def test_over_2_5_pattern_strict():
    home = _form(goals_for=[2] * 10, goals_against=[2] * 10)   # all 4-goal matches
    away = _form(goals_for=[2] * 10, goals_against=[2] * 10)
    h2h = [_btts_fixture(2, 2)] * 5                             # all 4-goal H2H
    ctx = _ctx(home, away, h2h)
    picks = [p for p in scan_patterns(ctx) if p.outcome == "over_2_5"]
    assert len(picks) == 1


def test_home_dominant_pattern_strict():
    home = _form(
        goals_for=[2] * 10,
        goals_against=[0] * 10,
        last_results=["W"] * 10,
    )
    away = _form(
        goals_for=[0] * 10,
        goals_against=[2] * 10,
        last_results=["L"] * 10,
    )
    h2h = [
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 2, "score_away": 0},
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 1, "score_away": 0},
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 0, "score_away": 1},
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 0, "score_away": 2},
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 3, "score_away": 1},
    ]
    ctx = _ctx(home, away, h2h)
    picks = [p for p in scan_patterns(ctx) if p.outcome == "home_win"]
    assert len(picks) == 1


def test_home_dominant_skipped_when_h2h_not_perfect():
    home = _form(goals_for=[2] * 10, goals_against=[0] * 10, last_results=["W"] * 10)
    away = _form(goals_for=[0] * 10, goals_against=[2] * 10, last_results=["L"] * 10)
    # 4/5 home wins in H2H — fails 100% requirement
    h2h = [
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 2, "score_away": 0},
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 1, "score_away": 0},
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 1, "score_away": 1},  # draw
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 0, "score_away": 2},
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 3, "score_away": 1},
    ]
    ctx = _ctx(home, away, h2h)
    assert [p for p in scan_patterns(ctx) if p.outcome == "home_win"] == []


def test_no_pattern_when_window_too_small():
    home = _form(goals_for=[1] * 5, goals_against=[1] * 5, matches=5)
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 5
    ctx = _ctx(home, away, h2h)
    assert scan_patterns(ctx) == []


def test_attach_odds_picks_best_bookmaker():
    home = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 5
    ctx = _ctx(home, away, h2h)
    [pick] = [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"]

    quotes = [
        MarketQuote("BTTS", "btts_yes", "Bet365", 1.80),
        MarketQuote("BTTS", "btts_no", "Bet365", 2.00),
        MarketQuote("BTTS", "btts_yes", "Pinnacle", 1.95),
        MarketQuote("BTTS", "btts_no", "Pinnacle", 1.85),
    ]
    enriched = attach_odds(pick, quotes)
    assert enriched is not None
    assert enriched.bookmaker == "Pinnacle"
    assert enriched.decimal_odds == 1.95


def test_attach_odds_returns_none_when_market_missing():
    home = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 5
    ctx = _ctx(home, away, h2h)
    [pick] = [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"]
    quotes = [MarketQuote("1X2", "home_win", "X", 2.0)]
    assert attach_odds(pick, quotes) is None
