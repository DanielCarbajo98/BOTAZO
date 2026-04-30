from src.analyzer.match_context import HeadToHead, MatchContext, TeamForm
from src.analyzer.pattern_scanner import (
    LAST_N,
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


def test_btts_yes_pattern_detected_when_streaks_align():
    # 9/10 BTTS for both teams
    home = _form(
        goals_for=[2, 1, 1, 2, 1, 2, 1, 1, 2, 0],
        goals_against=[1, 1, 2, 1, 1, 2, 1, 1, 1, 0],
    )
    away = _form(
        goals_for=[2, 1, 3, 2, 1, 1, 2, 1, 1, 0],
        goals_against=[1, 2, 1, 2, 2, 1, 1, 2, 1, 0],
    )
    # H2H: 4/5 BTTS
    h2h = [
        _btts_fixture(2, 1),
        _btts_fixture(1, 2),
        _btts_fixture(3, 1),
        _btts_fixture(2, 2),
        _btts_fixture(1, 0),  # not BTTS
    ]
    ctx = _ctx(home, away, h2h)
    picks = scan_patterns(ctx)
    btts_yes = [p for p in picks if p.market == "BTTS" and p.outcome == "btts_yes"]
    assert len(btts_yes) == 1
    assert btts_yes[0].pattern_strength >= 0.8


def test_btts_yes_skipped_when_h2h_breaks_pattern():
    home = _form(
        goals_for=[2, 1, 1, 2, 1, 2, 1, 1, 2, 1],
        goals_against=[1, 1, 2, 1, 1, 2, 1, 1, 1, 1],
    )
    away = _form(
        goals_for=[2, 1, 3, 2, 1, 1, 2, 1, 1, 1],
        goals_against=[1, 2, 1, 2, 2, 1, 1, 2, 1, 1],
    )
    h2h = [
        _btts_fixture(2, 0),
        _btts_fixture(1, 0),
        _btts_fixture(0, 1),
    ]
    ctx = _ctx(home, away, h2h)
    picks = scan_patterns(ctx)
    btts_yes = [p for p in picks if p.market == "BTTS" and p.outcome == "btts_yes"]
    assert btts_yes == []


def test_over_2_5_pattern():
    # Make sure totals are >= 3 in 9/10 matches for each team
    home = _form(
        goals_for=[2, 2, 3, 1, 2, 2, 3, 1, 2, 0],
        goals_against=[1, 2, 1, 2, 2, 1, 1, 2, 1, 1],
    )
    away = _form(
        goals_for=[3, 1, 2, 2, 2, 1, 3, 2, 2, 0],
        goals_against=[1, 2, 2, 1, 1, 2, 1, 1, 2, 1],
    )
    h2h = [
        _btts_fixture(2, 2),
        _btts_fixture(3, 1),
        _btts_fixture(2, 2),
        _btts_fixture(3, 0),
    ]
    ctx = _ctx(home, away, h2h)
    picks = scan_patterns(ctx)
    over = [p for p in picks if p.market == "OVER_UNDER_2_5" and p.outcome == "over_2_5"]
    assert len(over) == 1


def test_home_dominant_pattern():
    home = _form(
        goals_for=[2, 1, 3, 2, 2, 3, 1, 2, 2, 1],
        goals_against=[0, 0, 1, 0, 1, 0, 0, 1, 0, 0],
        last_results=["W", "W", "W", "W", "W", "W", "W", "W", "L", "W"],  # 9W
    )
    away = _form(
        goals_for=[0, 1, 0, 0, 1, 0, 1, 0, 1, 1],
        goals_against=[2, 1, 2, 3, 2, 1, 2, 2, 1, 0],
        last_results=["L", "L", "L", "W", "L", "L", "L", "L", "L", "D"],  # 8L
    )
    h2h = [
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 2, "score_away": 0},
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 3, "score_away": 1},
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 0, "score_away": 1},
    ]
    ctx = _ctx(home, away, h2h)
    picks = scan_patterns(ctx)
    home_win = [p for p in picks if p.market == "1X2" and p.outcome == "home_win"]
    assert len(home_win) == 1


def test_no_pattern_when_inconsistent_form():
    home = _form(
        goals_for=[3, 0, 2, 1, 0, 2, 0, 1, 0, 2],
        goals_against=[2, 1, 2, 1, 1, 0, 1, 0, 1, 1],
        last_results=["W", "L", "W", "D", "L", "W", "L", "D", "L", "W"],
    )
    away = _form(
        goals_for=[2, 0, 1, 1, 0, 0, 2, 1, 0, 1],
        goals_against=[2, 1, 1, 1, 1, 0, 0, 0, 1, 1],
        last_results=["D", "L", "D", "W", "L", "D", "W", "W", "L", "D"],
    )
    ctx = _ctx(home, away, [])
    picks = scan_patterns(ctx)
    assert picks == []


def test_attach_odds_picks_best_bookmaker_for_outcome():
    home = _form(
        goals_for=[1] * 10,
        goals_against=[1] * 10,
    )
    away = _form(
        goals_for=[1] * 10,
        goals_against=[1] * 10,
    )
    h2h = [
        _btts_fixture(1, 1),
        _btts_fixture(2, 1),
        _btts_fixture(1, 2),
        _btts_fixture(1, 1),
    ]
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
    assert enriched.recommended_stake_pct > 0


def test_attach_odds_returns_none_when_market_missing():
    home = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    h2h = [_btts_fixture(1, 1)] * 4
    ctx = _ctx(home, away, h2h)
    [pick] = [p for p in scan_patterns(ctx) if p.outcome == "btts_yes"]
    quotes = [MarketQuote("1X2", "home_win", "X", 2.0)]
    assert attach_odds(pick, quotes) is None


def test_pattern_skipped_when_window_too_small():
    """If a team has fewer than 10 finished matches we can't trust the
    pattern — don't emit anything."""
    home = _form(
        goals_for=[1, 1, 1, 1, 1],   # only 5 matches
        goals_against=[1, 1, 1, 1, 1],
        matches=5,
    )
    away = _form(goals_for=[1] * 10, goals_against=[1] * 10)
    ctx = _ctx(home, away, [])
    assert scan_patterns(ctx) == []
