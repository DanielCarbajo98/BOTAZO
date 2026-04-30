from src.models.value_detector import (
    MarketQuote,
    best_value_bet_per_market,
    detect_value_bets,
    expected_value,
    implied_probability,
)


def test_implied_probability_sane():
    assert abs(implied_probability(2.0) - 0.5) < 1e-9
    assert implied_probability(1.0) == 0.0
    assert abs(implied_probability(4.0) - 0.25) < 1e-9


def test_expected_value_positive_when_edge():
    # 60% at 2.0 -> EV = 0.6*1 - 0.4 = +0.20
    assert abs(expected_value(0.60, 2.0) - 0.20) < 1e-9


def test_detect_value_bets_flags_only_when_edge_above_threshold():
    model = {"home_win": 0.55, "draw": 0.25, "away_win": 0.20}
    quotes = [
        MarketQuote("1X2", "home_win", "Bet365", 2.10),  # implied 47.6%, edge +7.4 -> flag
        MarketQuote("1X2", "draw", "Bet365", 3.50),       # implied 28.6%, edge -3.6 -> skip
        MarketQuote("1X2", "away_win", "Bet365", 4.50),   # implied 22.2%, edge -2.2 -> skip
    ]
    bets = detect_value_bets(123, "Madrid vs Barca", model, quotes)
    assert len(bets) == 1
    assert bets[0].outcome == "home_win"
    assert bets[0].edge > 0.05
    assert bets[0].expected_value > 0


def test_detect_value_bets_uses_5pct_default_threshold():
    model = {"home_win": 0.50}
    # 4.5% edge: implied 45.5% (odds 2.20), model 50% -> diff 0.045 -> below default
    quotes = [MarketQuote("1X2", "home_win", "X", 2.20)]
    bets = detect_value_bets(1, "A vs B", model, quotes)
    assert bets == []


def test_best_per_market_picks_highest_edge():
    model = {"home_win": 0.55}
    quotes = [
        MarketQuote("1X2", "home_win", "Bet365", 2.05),
        MarketQuote("1X2", "home_win", "Pinnacle", 2.20),
        MarketQuote("1X2", "home_win", "Bwin", 2.10),
    ]
    bets = detect_value_bets(1, "X", model, quotes)
    best = best_value_bet_per_market(bets)
    assert len(best) == 1
    assert best[0].bookmaker == "Pinnacle"  # highest odds = highest edge


def test_skipped_when_market_outcome_not_in_model():
    model = {"home_win": 0.5}
    quotes = [MarketQuote("BTTS", "btts_yes", "X", 1.80)]
    bets = detect_value_bets(1, "X", model, quotes)
    assert bets == []
