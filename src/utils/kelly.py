"""Kelly criterion sizing.

Full Kelly maximises log-growth of bankroll under perfect knowledge. In
practice we don't have perfect probabilities so betting full Kelly will
overshoot — fractional Kelly (here 25%) keeps growth respectable while
clipping the variance.
"""
from __future__ import annotations

from dataclasses import dataclass

DEFAULT_FRACTION = 0.25
DEFAULT_MAX_STAKE_PCT = 0.05  # never put more than 5% of bankroll on one bet


def kelly_full_fraction(probability: float, decimal_odds: float) -> float:
    """Stake fraction recommended by full Kelly. Negative or zero means no bet."""
    if decimal_odds <= 1.0 or probability <= 0.0 or probability >= 1.0:
        return 0.0
    b = decimal_odds - 1.0  # net odds (profit per unit staked)
    q = 1.0 - probability
    edge = probability * b - q
    if edge <= 0:
        return 0.0
    return edge / b


@dataclass(frozen=True)
class StakeRecommendation:
    full_kelly_pct: float
    fractional_kelly_pct: float
    capped_pct: float
    fraction_used: float
    max_cap: float

    @property
    def stake_pct(self) -> float:
        return self.capped_pct


def recommend_stake(
    probability: float,
    decimal_odds: float,
    fraction: float = DEFAULT_FRACTION,
    max_stake_pct: float = DEFAULT_MAX_STAKE_PCT,
) -> StakeRecommendation:
    full = kelly_full_fraction(probability, decimal_odds)
    fractional = full * fraction
    capped = min(fractional, max_stake_pct)
    return StakeRecommendation(
        full_kelly_pct=full,
        fractional_kelly_pct=fractional,
        capped_pct=capped,
        fraction_used=fraction,
        max_cap=max_stake_pct,
    )
