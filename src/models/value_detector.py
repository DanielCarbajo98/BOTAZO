"""Value bet detection.

Compare the model's probability for an outcome against the bookmaker's
implied probability (= 1 / decimal_odds, after de-vigging if we have all
outcomes for the market). When edge >= MIN_EDGE we mark it as a value bet.

Edge is expressed as a percentage point gap:

    edge = model_probability - implied_probability

EV per 1 unit staked is:

    ev = model_probability * (decimal_odds - 1) - (1 - model_probability)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional

from src.utils.kelly import recommend_stake

MIN_EDGE = 0.05  # 5 percentage points


@dataclass(frozen=True)
class MarketQuote:
    market: str          # e.g. "1X2", "OVER_UNDER_2_5", "BTTS"
    outcome: str         # e.g. "home_win", "draw", "away_win", "over_2_5"...
    bookmaker: str
    decimal_odds: float


@dataclass(frozen=True)
class ValueBet:
    fixture_api_id: int
    match_label: str
    market: str
    outcome: str
    bookmaker: str
    decimal_odds: float
    model_probability: float
    implied_probability: float
    edge: float
    expected_value: float
    recommended_stake_pct: float
    confidence: str

    def as_row(self) -> dict:
        return {
            "fixture_api_id": self.fixture_api_id,
            "match_label": self.match_label,
            "market": self.market,
            "outcome": self.outcome,
            "model_probability": self.model_probability,
            "market_odds": self.decimal_odds,
            "implied_probability": self.implied_probability,
            "edge": self.edge,
            "expected_value": self.expected_value,
            "recommended_stake_pct": self.recommended_stake_pct,
            "confidence": self.confidence,
            "reasoning": (
                f"Model {self.model_probability*100:.1f}% vs market "
                f"{self.implied_probability*100:.1f}% "
                f"@ {self.decimal_odds:.2f} ({self.bookmaker})"
            ),
        }

    def as_display(self) -> dict:
        """Same fields as_row plus bookmaker, for the report formatter."""
        row = self.as_row()
        row["bookmaker"] = self.bookmaker
        return row


def implied_probability(decimal_odds: float) -> float:
    if decimal_odds <= 1.0:
        return 0.0
    return 1.0 / decimal_odds


def expected_value(probability: float, decimal_odds: float) -> float:
    return probability * (decimal_odds - 1.0) - (1.0 - probability)


def _confidence_label(model_probability: float, edge: float) -> str:
    if edge >= 0.10 and model_probability >= 0.55:
        return "alta"
    if edge >= 0.07:
        return "media"
    return "baja"


def detect_value_bets(
    fixture_api_id: int,
    match_label: str,
    model_probabilities: dict,
    quotes: Iterable[MarketQuote],
    min_edge: float = MIN_EDGE,
) -> List[ValueBet]:
    """For a single fixture, check every market quote against our model."""
    out: List[ValueBet] = []
    for q in quotes:
        model_p = model_probabilities.get(q.outcome)
        if model_p is None:
            continue
        implied = implied_probability(q.decimal_odds)
        if implied <= 0:
            continue
        edge = model_p - implied
        if edge < min_edge:
            continue
        ev = expected_value(model_p, q.decimal_odds)
        stake = recommend_stake(model_p, q.decimal_odds)
        out.append(
            ValueBet(
                fixture_api_id=fixture_api_id,
                match_label=match_label,
                market=q.market,
                outcome=q.outcome,
                bookmaker=q.bookmaker,
                decimal_odds=q.decimal_odds,
                model_probability=model_p,
                implied_probability=implied,
                edge=edge,
                expected_value=ev,
                recommended_stake_pct=stake.stake_pct,
                confidence=_confidence_label(model_p, edge),
            )
        )
    return out


def best_value_bet_per_market(bets: Iterable[ValueBet]) -> List[ValueBet]:
    """When multiple bookmakers offer the same outcome, keep the best edge."""
    best: dict[tuple[int, str, str], ValueBet] = {}
    for b in bets:
        key = (b.fixture_api_id, b.market, b.outcome)
        prev = best.get(key)
        if prev is None or b.edge > prev.edge:
            best[key] = b
    return list(best.values())
