"""Value bet detection.

Compare the model's probability for an outcome against the bookmaker's
*fair* probability (the implied probability after stripping the bookie's
margin / vig). When the model's probability beats the fair probability by
at least MIN_EDGE we mark it as a value bet.

Why de-vigging matters: bookmakers price markets so the implied
probabilities sum to >1 (the overround = their margin). Comparing model
vs raw 1/odds penalises us by the full margin (4-7% typically), making
the model look worse than it is. De-vigging gives us a fair view of the
bookie's true estimate.

Edge:        edge = model_probability - fair_probability
EV per unit: ev = model_probability * (decimal_odds - 1) - (1 - model_probability)
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

from src.utils.kelly import recommend_stake

# 3 percentage points on de-vigged implied = comfortable threshold for a
# tipster product. Below 3 we flag as "low confidence pick of the day".
MIN_EDGE = 0.03

# Outcomes that together form a complete market (used for de-vigging).
_MARKET_OUTCOMES: Dict[str, Tuple[str, ...]] = {
    "1X2": ("home_win", "draw", "away_win"),
    "OVER_UNDER_2_5": ("over_2_5", "under_2_5"),
    "BTTS": ("btts_yes", "btts_no"),
}


@dataclass(frozen=True)
class MarketQuote:
    market: str
    outcome: str
    bookmaker: str
    decimal_odds: float


@dataclass(frozen=True)
class FairQuote:
    market: str
    outcome: str
    bookmaker: str
    decimal_odds: float
    fair_probability: float  # de-vigged when possible, else 1/odds


@dataclass(frozen=True)
class ValueBet:
    fixture_api_id: int
    match_label: str
    market: str
    outcome: str
    bookmaker: str
    decimal_odds: float
    model_probability: float
    implied_probability: float  # stored as fair (de-vigged) probability
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
                f"Model {self.model_probability*100:.1f}% vs fair "
                f"{self.implied_probability*100:.1f}% "
                f"@ {self.decimal_odds:.2f} ({self.bookmaker})"
            ),
        }

    def as_display(self) -> dict:
        row = self.as_row()
        row["bookmaker"] = self.bookmaker
        return row


def implied_probability(decimal_odds: float) -> float:
    if decimal_odds <= 1.0:
        return 0.0
    return 1.0 / decimal_odds


def expected_value(probability: float, decimal_odds: float) -> float:
    return probability * (decimal_odds - 1.0) - (1.0 - probability)


def devig_quotes(quotes: Iterable[MarketQuote]) -> List[FairQuote]:
    """Group quotes by (bookmaker, market). When a group contains every
    outcome required by that market, normalise their implied probabilities
    to sum to 1. Otherwise fall back to raw 1/odds for incomplete groups.
    """
    groups: Dict[Tuple[str, str], List[MarketQuote]] = defaultdict(list)
    for q in quotes:
        groups[(q.bookmaker, q.market)].append(q)

    out: List[FairQuote] = []
    for (book, market), group in groups.items():
        required = _MARKET_OUTCOMES.get(market)
        present = {q.outcome: q for q in group}

        if required and all(o in present for o in required):
            total = sum(implied_probability(present[o].decimal_odds) for o in required)
            if total <= 0:
                continue
            for o in required:
                q = present[o]
                fair = implied_probability(q.decimal_odds) / total
                out.append(
                    FairQuote(
                        market=q.market,
                        outcome=q.outcome,
                        bookmaker=q.bookmaker,
                        decimal_odds=q.decimal_odds,
                        fair_probability=fair,
                    )
                )
        else:
            # Incomplete market for this bookie -> can't de-vig, use raw.
            for q in group:
                out.append(
                    FairQuote(
                        market=q.market,
                        outcome=q.outcome,
                        bookmaker=q.bookmaker,
                        decimal_odds=q.decimal_odds,
                        fair_probability=implied_probability(q.decimal_odds),
                    )
                )
    return out


def _confidence_label(model_probability: float, edge: float) -> str:
    if edge >= 0.08 and model_probability >= 0.50:
        return "alta"
    if edge >= 0.05:
        return "media"
    if edge >= MIN_EDGE:
        return "media-baja"
    return "baja"


def _build_value_bet(
    fixture_api_id: int,
    match_label: str,
    model_p: float,
    fair_q: FairQuote,
) -> ValueBet:
    edge = model_p - fair_q.fair_probability
    ev = expected_value(model_p, fair_q.decimal_odds)
    stake = recommend_stake(model_p, fair_q.decimal_odds)
    return ValueBet(
        fixture_api_id=fixture_api_id,
        match_label=match_label,
        market=fair_q.market,
        outcome=fair_q.outcome,
        bookmaker=fair_q.bookmaker,
        decimal_odds=fair_q.decimal_odds,
        model_probability=model_p,
        implied_probability=fair_q.fair_probability,
        edge=edge,
        expected_value=ev,
        recommended_stake_pct=stake.stake_pct,
        confidence=_confidence_label(model_p, edge),
    )


def evaluate_all_quotes(
    fixture_api_id: int,
    match_label: str,
    model_probabilities: dict,
    fair_quotes: Iterable[FairQuote],
) -> List[ValueBet]:
    """Return ALL bets (positive AND negative edge) for ranking purposes."""
    out: List[ValueBet] = []
    for q in fair_quotes:
        model_p = model_probabilities.get(q.outcome)
        if model_p is None:
            continue
        out.append(_build_value_bet(fixture_api_id, match_label, model_p, q))
    return out


def detect_value_bets(
    fixture_api_id: int,
    match_label: str,
    model_probabilities: dict,
    quotes: Iterable[MarketQuote],
    min_edge: float = MIN_EDGE,
) -> List[ValueBet]:
    """High-level helper: de-vig the quotes, then keep only edge >= min_edge."""
    fair = devig_quotes(quotes)
    candidates = evaluate_all_quotes(fixture_api_id, match_label, model_probabilities, fair)
    return [c for c in candidates if c.edge >= min_edge]


def best_value_bet_per_market(bets: Iterable[ValueBet]) -> List[ValueBet]:
    """When multiple bookmakers offer the same outcome, keep the best edge."""
    best: dict[tuple[int, str, str], ValueBet] = {}
    for b in bets:
        key = (b.fixture_api_id, b.market, b.outcome)
        prev = best.get(key)
        if prev is None or b.edge > prev.edge:
            best[key] = b
    return list(best.values())
