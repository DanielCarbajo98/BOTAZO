from src.analyzer.stats import _max_drawdown


def test_max_drawdown_no_drop_when_monotonic_up():
    assert _max_drawdown([0, 1, 2, 3, 4]) == 0


def test_max_drawdown_simple_dip():
    # Peak 5, trough 1 -> drawdown 4
    assert abs(_max_drawdown([0, 2, 5, 3, 1, 4]) - 4) < 1e-9


def test_max_drawdown_handles_negative_values():
    assert abs(_max_drawdown([0, -1, -3, -5]) - 5) < 1e-9


def test_max_drawdown_resets_after_new_peak():
    # 0 -> 10 (peak1) -> 5 (drop 5) -> 12 (new peak) -> 2 (drop 10)
    series = [0, 5, 10, 7, 5, 12, 8, 4, 2]
    assert abs(_max_drawdown(series) - 10) < 1e-9
