from src.jobs.resolve_picks import _outcome_won, _pnl_units


def test_1x2_home_win():
    assert _outcome_won("1X2", "home_win", 2, 1) is True
    assert _outcome_won("1X2", "home_win", 1, 1) is False
    assert _outcome_won("1X2", "home_win", 0, 1) is False


def test_1x2_draw():
    assert _outcome_won("1X2", "draw", 1, 1) is True
    assert _outcome_won("1X2", "draw", 2, 0) is False


def test_1x2_away_win():
    assert _outcome_won("1X2", "away_win", 0, 2) is True
    assert _outcome_won("1X2", "away_win", 0, 0) is False


def test_over_under_2_5():
    assert _outcome_won("OVER_UNDER_2_5", "over_2_5", 2, 1) is True   # total 3
    assert _outcome_won("OVER_UNDER_2_5", "over_2_5", 1, 1) is False  # total 2
    assert _outcome_won("OVER_UNDER_2_5", "under_2_5", 0, 0) is True
    assert _outcome_won("OVER_UNDER_2_5", "under_2_5", 2, 0) is True
    assert _outcome_won("OVER_UNDER_2_5", "under_2_5", 2, 1) is False


def test_btts():
    assert _outcome_won("BTTS", "btts_yes", 1, 1) is True
    assert _outcome_won("BTTS", "btts_yes", 1, 0) is False
    assert _outcome_won("BTTS", "btts_no", 1, 0) is True
    assert _outcome_won("BTTS", "btts_no", 1, 1) is False


def test_unknown_market_returns_none():
    assert _outcome_won("CORNERS", "over_9_5", 5, 5) is None


def test_pnl_won_uses_decimal_odds_minus_one():
    label, pnl = _pnl_units(True, stake_pct=0.02, decimal_odds=2.50)
    # 2% banca = 2 unidades; profit = 2 * (2.5 - 1) = 3.0
    assert label == "won"
    assert abs(pnl - 3.0) < 1e-9


def test_pnl_lost_returns_negative_stake():
    label, pnl = _pnl_units(False, stake_pct=0.02, decimal_odds=2.50)
    assert label == "lost"
    assert abs(pnl + 2.0) < 1e-9


def test_pnl_void_is_zero():
    label, pnl = _pnl_units(None, stake_pct=0.02, decimal_odds=2.50)
    assert label == "void"
    assert pnl == 0.0
