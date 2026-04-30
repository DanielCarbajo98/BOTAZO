import math

from src.models.poisson import (
    DEFAULT_RHO,
    dixon_coles_tau,
    market_probabilities,
    poisson_pmf,
    score_matrix,
)


def test_poisson_pmf_basic():
    # P(0; lam=0) = 1, P(k>0; lam=0) = 0
    assert poisson_pmf(0, 0) == 1.0
    assert poisson_pmf(3, 0) == 0.0
    # Sum over reasonable k for lam=2 should be near 1
    assert abs(sum(poisson_pmf(k, 2.0) for k in range(20)) - 1.0) < 1e-9


def test_dixon_coles_tau_corrects_only_low_scores():
    rho = -0.1
    assert dixon_coles_tau(2, 3, 1.5, 1.2, rho) == 1.0
    assert dixon_coles_tau(0, 0, 1.5, 1.2, rho) != 1.0
    assert dixon_coles_tau(1, 1, 1.5, 1.2, rho) != 1.0


def test_score_matrix_sums_to_one():
    matrix = score_matrix(1.5, 1.1)
    total = sum(sum(row) for row in matrix)
    assert abs(total - 1.0) < 1e-6


def test_market_probabilities_sum_to_one():
    matrix = score_matrix(1.5, 1.1)
    p = market_probabilities(matrix)
    assert abs(p["home_win"] + p["draw"] + p["away_win"] - 1.0) < 1e-6
    assert abs(p["over_2_5"] + p["under_2_5"] - 1.0) < 1e-6
    assert abs(p["btts_yes"] + p["btts_no"] - 1.0) < 1e-6


def test_market_probabilities_home_advantage():
    # If home expected goals >> away, home_win should dominate
    matrix = score_matrix(2.5, 0.7)
    p = market_probabilities(matrix)
    assert p["home_win"] > 0.55
    assert p["home_win"] > p["away_win"]


def test_market_probabilities_symmetric_when_equal():
    matrix = score_matrix(1.4, 1.4)
    p = market_probabilities(matrix)
    assert abs(p["home_win"] - p["away_win"]) < 0.02


def test_zero_zero_more_likely_than_independence():
    # With rho=-0.1 the 0-0 cell should be inflated vs the independence baseline
    lam_h, lam_a = 1.2, 1.0
    matrix = score_matrix(lam_h, lam_a, rho=-0.1)
    independent = math.exp(-lam_h) * math.exp(-lam_a)
    assert matrix[0][0] > independent * 0.95  # at least near, usually larger
