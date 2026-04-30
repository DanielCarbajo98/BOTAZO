from src.utils.kelly import (
    DEFAULT_FRACTION,
    DEFAULT_MAX_STAKE_PCT,
    kelly_full_fraction,
    recommend_stake,
)


def test_kelly_zero_when_no_edge():
    # Fair coin at evens -> no edge
    assert kelly_full_fraction(0.5, 2.0) == 0.0


def test_kelly_zero_when_negative_edge():
    # Lower probability than implied by odds
    assert kelly_full_fraction(0.40, 2.0) == 0.0


def test_kelly_positive_when_edge():
    # 60% chance at evens -> positive edge
    f = kelly_full_fraction(0.60, 2.0)
    assert 0.15 < f < 0.25  # full Kelly = (0.6*1 - 0.4) / 1 = 0.20


def test_kelly_invalid_odds_returns_zero():
    assert kelly_full_fraction(0.6, 1.0) == 0.0
    assert kelly_full_fraction(0.6, 0.5) == 0.0


def test_recommend_stake_caps_at_max():
    # Huge edge: full Kelly = (0.9 * 9 - 0.1)/9 = ~0.89
    rec = recommend_stake(0.90, 10.0)
    # 25% of 0.89 = 0.22, capped at DEFAULT_MAX_STAKE_PCT (0.05)
    assert rec.stake_pct == DEFAULT_MAX_STAKE_PCT


def test_recommend_stake_uses_25_percent_fraction_by_default():
    rec = recommend_stake(0.60, 2.0)
    # full = 0.20, fractional = 0.05
    assert abs(rec.fractional_kelly_pct - 0.05) < 1e-9
    assert rec.fraction_used == DEFAULT_FRACTION


def test_recommend_stake_zero_when_no_edge():
    rec = recommend_stake(0.50, 2.0)
    assert rec.stake_pct == 0.0
    assert rec.full_kelly_pct == 0.0
