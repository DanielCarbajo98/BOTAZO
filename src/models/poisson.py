"""Bivariate Poisson with Dixon-Coles low-score correction.

The vanilla independent-Poisson model overstates 0-0/1-1/etc. likelihood
because real low-scoring games are correlated. Dixon & Coles (1997)
introduce a correction tau(i, j) that nudges those four cells.
"""
from __future__ import annotations

import math
from typing import Dict, List

# Negative rho means 0-0, 1-1 are more frequent than independence implies.
# -0.10 is the value reported by Dixon-Coles for English leagues; it is
# not far from typical estimates for current top-5 leagues.
DEFAULT_RHO = -0.10
MAX_GOALS = 8  # cell beyond which probability mass is negligible


def poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam**k) / math.factorial(k)


def dixon_coles_tau(
    home_goals: int, away_goals: int, lam_home: float, lam_away: float, rho: float
) -> float:
    if home_goals == 0 and away_goals == 0:
        return 1.0 - lam_home * lam_away * rho
    if home_goals == 1 and away_goals == 0:
        return 1.0 + lam_away * rho
    if home_goals == 0 and away_goals == 1:
        return 1.0 + lam_home * rho
    if home_goals == 1 and away_goals == 1:
        return 1.0 - rho
    return 1.0


def score_matrix(
    lam_home: float,
    lam_away: float,
    max_goals: int = MAX_GOALS,
    rho: float = DEFAULT_RHO,
) -> List[List[float]]:
    """Return a (max_goals+1) x (max_goals+1) probability matrix.

    matrix[i][j] = P(home scores i, away scores j) under Dixon-Coles.
    Sums to ~1 once the small Dixon-Coles distortion is renormalised.
    """
    home_pmf = [poisson_pmf(i, lam_home) for i in range(max_goals + 1)]
    away_pmf = [poisson_pmf(j, lam_away) for j in range(max_goals + 1)]
    matrix = [
        [
            home_pmf[i]
            * away_pmf[j]
            * dixon_coles_tau(i, j, lam_home, lam_away, rho)
            for j in range(max_goals + 1)
        ]
        for i in range(max_goals + 1)
    ]
    total = sum(sum(row) for row in matrix)
    if total > 0:
        matrix = [[v / total for v in row] for row in matrix]
    return matrix


def market_probabilities(matrix: List[List[float]]) -> Dict[str, float]:
    """Aggregate the score matrix into the markets the bot bets on."""
    home_win = draw = away_win = 0.0
    over_15 = over_25 = over_35 = 0.0
    btts = 0.0
    for i, row in enumerate(matrix):
        for j, p in enumerate(row):
            if p == 0:
                continue
            if i > j:
                home_win += p
            elif i < j:
                away_win += p
            else:
                draw += p
            total = i + j
            if total >= 2:
                over_15 += p
            if total >= 3:
                over_25 += p
            if total >= 4:
                over_35 += p
            if i > 0 and j > 0:
                btts += p
    return {
        "home_win": home_win,
        "draw": draw,
        "away_win": away_win,
        "over_1_5": over_15,
        "under_1_5": 1.0 - over_15,
        "over_2_5": over_25,
        "under_2_5": 1.0 - over_25,
        "over_3_5": over_35,
        "under_3_5": 1.0 - over_35,
        "btts_yes": btts,
        "btts_no": 1.0 - btts,
    }
