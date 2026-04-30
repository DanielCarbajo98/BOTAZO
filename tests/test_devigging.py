from src.models.value_detector import (
    MIN_EDGE,
    MarketQuote,
    detect_value_bets,
    devig_quotes,
    evaluate_all_quotes,
)


def test_devig_normalises_complete_1x2_market():
    quotes = [
        MarketQuote("1X2", "home_win", "Pinnacle", 2.10),  # 0.476
        MarketQuote("1X2", "draw", "Pinnacle", 3.50),       # 0.286
        MarketQuote("1X2", "away_win", "Pinnacle", 4.00),   # 0.250
        # Sum 1.012 -> 1.2% margin
    ]
    fair = devig_quotes(quotes)
    assert len(fair) == 3
    total = sum(f.fair_probability for f in fair)
    assert abs(total - 1.0) < 1e-9
    home = next(f for f in fair if f.outcome == "home_win")
    # 0.476 / 1.012 ≈ 0.471
    assert abs(home.fair_probability - 0.471) < 0.01


def test_devig_falls_back_to_raw_when_market_incomplete():
    # Only home and draw quoted; can't de-vig.
    quotes = [
        MarketQuote("1X2", "home_win", "Pinnacle", 2.10),
        MarketQuote("1X2", "draw", "Pinnacle", 3.50),
    ]
    fair = devig_quotes(quotes)
    assert len(fair) == 2
    home = next(f for f in fair if f.outcome == "home_win")
    assert abs(home.fair_probability - (1 / 2.10)) < 1e-9


def test_devig_separates_bookmakers():
    quotes = [
        MarketQuote("1X2", "home_win", "Pinnacle", 2.10),
        MarketQuote("1X2", "draw", "Pinnacle", 3.50),
        MarketQuote("1X2", "away_win", "Pinnacle", 4.00),
        MarketQuote("1X2", "home_win", "Bet365", 2.20),
        MarketQuote("1X2", "draw", "Bet365", 3.40),
        MarketQuote("1X2", "away_win", "Bet365", 3.80),
    ]
    fair = devig_quotes(quotes)
    pinnacle = [f for f in fair if f.bookmaker == "Pinnacle"]
    bet365 = [f for f in fair if f.bookmaker == "Bet365"]
    assert abs(sum(f.fair_probability for f in pinnacle) - 1.0) < 1e-9
    assert abs(sum(f.fair_probability for f in bet365) - 1.0) < 1e-9


def test_value_bets_detected_with_devigged_threshold():
    # Bookmaker has 1.5% margin; raw implied for home @ 2.10 = 0.476
    # De-vigged ≈ 0.469. Model says 0.50 -> edge ≈ 0.031 (3.1%) -> just clears.
    model = {"home_win": 0.50, "draw": 0.27, "away_win": 0.23}
    quotes = [
        MarketQuote("1X2", "home_win", "X", 2.10),
        MarketQuote("1X2", "draw", "X", 3.40),
        MarketQuote("1X2", "away_win", "X", 4.10),
    ]
    bets = detect_value_bets(1, "A vs B", model, quotes)
    assert len(bets) == 1
    assert bets[0].outcome == "home_win"
    assert bets[0].edge >= MIN_EDGE


def test_evaluate_all_quotes_returns_negatives_too():
    """evaluate_all_quotes is the basis for the pick-of-the-day fallback —
    must include every (market, outcome) combination, edge sign aside."""
    model = {"home_win": 0.30, "draw": 0.30, "away_win": 0.40}
    quotes = [
        MarketQuote("1X2", "home_win", "X", 2.10),
        MarketQuote("1X2", "draw", "X", 3.40),
        MarketQuote("1X2", "away_win", "X", 4.10),
    ]
    fair = devig_quotes(quotes)
    bets = evaluate_all_quotes(1, "A vs B", model, fair)
    assert len(bets) == 3  # one per outcome, even negative edges
    edges = [b.edge for b in bets]
    assert any(e < 0 for e in edges)
