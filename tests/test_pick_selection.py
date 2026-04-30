"""Tests for the pick-of-the-day fallback logic in daily_report._select_picks."""
from src.analyzer.daily_report import _select_picks
from src.models.value_detector import ValueBet


def _bet(edge: float, ev: float = 0.05, market: str = "1X2", outcome: str = "home_win", fixture: int = 1) -> ValueBet:
    return ValueBet(
        fixture_api_id=fixture,
        match_label="A vs B",
        market=market,
        outcome=outcome,
        bookmaker="X",
        decimal_odds=2.0,
        model_probability=0.55,
        implied_probability=0.55 - edge,
        edge=edge,
        expected_value=ev,
        recommended_stake_pct=0.01,
        confidence="media",
    )


def test_value_picks_when_edge_meets_threshold():
    candidates = [_bet(0.05), _bet(0.04, market="BTTS", outcome="btts_yes")]
    picks, fallback = _select_picks(candidates)
    assert len(picks) == 2
    assert fallback is None


def test_pick_of_the_day_when_all_below_threshold_but_positive_ev():
    candidates = [_bet(0.02, ev=0.04), _bet(0.01, ev=0.02, market="BTTS", outcome="btts_no")]
    picks, fallback = _select_picks(candidates)
    assert picks == []
    assert fallback is not None
    assert fallback.edge == 0.02  # the highest


def test_no_pick_when_all_negative_ev():
    candidates = [_bet(-0.03, ev=-0.05), _bet(-0.05, ev=-0.07)]
    picks, fallback = _select_picks(candidates)
    assert picks == []
    assert fallback is None


def test_no_pick_when_no_candidates():
    picks, fallback = _select_picks([])
    assert picks == []
    assert fallback is None


def test_dedup_picks_across_bookmakers_per_market():
    # Same fixture, same market, same outcome from two books — we keep
    # the higher-edge one only.
    candidates = [
        _bet(0.05, fixture=10),
        _bet(0.06, fixture=10),
        _bet(0.04, fixture=10, market="BTTS", outcome="btts_yes"),
    ]
    picks, _ = _select_picks(candidates)
    by_market = {(p.fixture_api_id, p.market, p.outcome) for p in picks}
    assert (10, "1X2", "home_win") in by_market
    assert len(by_market) == 2
