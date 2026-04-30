from src.models.value_detector import (
    MIN_EDGE,
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


def test_detect_value_bets_flags_when_edge_above_threshold():
    # Complete 1X2 market with ~3% margin. Model heavily favours home.
    model = {"home_win": 0.60, "draw": 0.25, "away_win": 0.15}
    quotes = [
        MarketQuote("1X2", "home_win", "Bet365", 2.05),
        MarketQuote("1X2", "draw", "Bet365", 3.40),
        MarketQuote("1X2", "away_win", "Bet365", 5.00),
    ]
    bets = detect_value_bets(123, "Madrid vs Barca", model, quotes)
    home = [b for b in bets if b.outcome == "home_win"]
    assert len(home) == 1
    assert home[0].edge >= MIN_EDGE
    assert home[0].expected_value > 0


def test_detect_value_bets_skips_below_threshold():
    # Model only marginally above implied -> below 3% threshold.
    model = {"home_win": 0.50}
    quotes = [MarketQuote("1X2", "home_win", "X", 2.05)]  # incomplete -> raw 1/odds = 0.488
    bets = detect_value_bets(1, "A vs B", model, quotes)
    # 0.50 - 0.488 = 0.012 < 0.03
    assert bets == []


def test_best_per_market_picks_highest_edge():
    model = {"home_win": 0.60, "draw": 0.25, "away_win": 0.15}
    # Three different bookies, complete 1X2 market each.
    quotes = []
    for book, home_odds in [("Bet365", 2.00), ("Pinnacle", 2.10), ("Bwin", 2.05)]:
        quotes.extend([
            MarketQuote("1X2", "home_win", book, home_odds),
            MarketQuote("1X2", "draw", book, 3.40),
            MarketQuote("1X2", "away_win", book, 5.00),
        ])
    bets = detect_value_bets(1, "X", model, quotes)
    best = best_value_bet_per_market([b for b in bets if b.outcome == "home_win"])
    assert len(best) == 1
    assert best[0].bookmaker == "Pinnacle"  # highest odds = highest edge


def test_skipped_when_market_outcome_not_in_model():
    model = {"home_win": 0.5}
    quotes = [MarketQuote("BTTS", "btts_yes", "X", 1.80)]
    bets = detect_value_bets(1, "X", model, quotes)
    assert bets == []
