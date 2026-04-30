"""Pattern-based pick scanner.

Looks for repeating statistical patterns that a tipster would call out:

  * "AA en 4/5 últimos para los dos equipos + AA en 4/5 H2H" -> BTTS Yes
  * "+2.5 en 4/5 últimos + en 4/5 H2H" -> Over 2.5
  * "Local imparable: gana 4/5 en casa + visitante pierde 4/5 fuera"
  * "Equipo X marca en sus últimos 5 + en últimos 5 H2H" -> team-to-score

These are deliberately *empirical* — we are NOT comparing model probability
to market. We are reading the streaks the data shows. The strength of a
pattern dictates the recommended stake (flat fractional Kelly with a cap).

A pattern is only emitted if:
  - The minimum sample size is met (last 5 matches per team, 3 H2H).
  - The pattern strength meets the threshold (>= 80% by default).
  - We can find live odds for the corresponding market+outcome (so the
    tipster post is actionable; otherwise we skip).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Optional

from src.analyzer.match_context import MatchContext
from src.models.value_detector import (
    FairQuote,
    MarketQuote,
    devig_quotes,
)

logger = logging.getLogger(__name__)

MIN_PATTERN_RATE = 0.8         # 4/5 or 8/10 minimum
MIN_LAST_N = 5                 # need at least 5 recent matches per team
MIN_H2H = 3                    # need at least 3 H2H matches
MAX_BULLETS = 4

PATTERN_STAKES = {
    "alta": 0.025,    # 2.5% banca
    "media": 0.015,   # 1.5%
    "baja": 0.010,    # 1.0%
}


@dataclass
class PatternPick:
    fixture_api_id: int
    match_label: str
    market: str
    outcome: str
    pattern_name: str             # short label e.g. "Doble racha AA"
    pattern_strength: float       # 0..1
    confidence: str               # "alta" / "media" / "baja"
    bullets: List[str]            # supporting facts (HTML)
    bookmaker: Optional[str] = None
    decimal_odds: Optional[float] = None
    fair_probability: Optional[float] = None
    recommended_stake_pct: float = 0.0

    def as_display(self) -> dict:
        return {
            "fixture_api_id": self.fixture_api_id,
            "match_label": self.match_label,
            "market": self.market,
            "outcome": self.outcome,
            "pattern_name": self.pattern_name,
            "pattern_strength": self.pattern_strength,
            "confidence": self.confidence,
            "bullets": self.bullets,
            "bookmaker": self.bookmaker,
            "market_odds": self.decimal_odds or 0.0,
            "model_probability": self.pattern_strength,
            "implied_probability": self.fair_probability or 0.0,
            "recommended_stake_pct": self.recommended_stake_pct,
            "expected_value": (
                self.pattern_strength * ((self.decimal_odds or 1.0) - 1.0)
                - (1.0 - self.pattern_strength)
                if self.decimal_odds
                else 0.0
            ),
            "edge": (
                self.pattern_strength - (self.fair_probability or 0.0)
                if self.fair_probability is not None
                else 0.0
            ),
        }


# ---------------------------------------------------------------------------
# Pattern detectors
# ---------------------------------------------------------------------------


def _strength_to_confidence(strength: float) -> str:
    if strength >= 0.9:
        return "alta"
    if strength >= 0.8:
        return "media"
    return "baja"


def _scan_btts_yes(ctx: MatchContext) -> Optional[PatternPick]:
    home_btts_5 = ctx.home_form.btts_in_last(5)
    away_btts_5 = ctx.away_form.btts_in_last(5)
    home_n = min(5, ctx.home_form.matches_considered)
    away_n = min(5, ctx.away_form.matches_considered)
    if home_n < MIN_LAST_N or away_n < MIN_LAST_N:
        return None
    home_rate = home_btts_5 / home_n
    away_rate = away_btts_5 / away_n
    if home_rate < MIN_PATTERN_RATE or away_rate < MIN_PATTERN_RATE:
        return None

    bullets = [
        f"{ctx.fixture.get('home_team_name')}: AA en <b>{home_btts_5}/{home_n}</b> últimos",
        f"{ctx.fixture.get('away_team_name')}: AA en <b>{away_btts_5}/{away_n}</b> últimos",
    ]

    h2h_factor = 1.0
    if ctx.h2h.matches >= MIN_H2H:
        h2h_btts = sum(
            1
            for fx in ctx.h2h.fixtures
            if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
        )
        h2h_n = ctx.h2h.matches
        h2h_factor = h2h_btts / h2h_n if h2h_n else 0
        if h2h_factor >= MIN_PATTERN_RATE:
            bullets.append(f"AA en <b>{h2h_btts}/{h2h_n}</b> de los últimos H2H")
        else:
            return None  # H2H breaks the pattern

    strength = (home_rate + away_rate + h2h_factor) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{ctx.fixture.get('home_team_name')} vs {ctx.fixture.get('away_team_name')}",
        market="BTTS",
        outcome="btts_yes",
        pattern_name="Doble racha AA",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
    )


def _scan_btts_no(ctx: MatchContext) -> Optional[PatternPick]:
    home_n = min(5, ctx.home_form.matches_considered)
    away_n = min(5, ctx.away_form.matches_considered)
    if home_n < MIN_LAST_N or away_n < MIN_LAST_N:
        return None
    home_no = home_n - ctx.home_form.btts_in_last(5)
    away_no = away_n - ctx.away_form.btts_in_last(5)
    if home_no / home_n < MIN_PATTERN_RATE or away_no / away_n < MIN_PATTERN_RATE:
        return None

    bullets = [
        f"{ctx.fixture.get('home_team_name')}: NO AA en <b>{home_no}/{home_n}</b> últimos",
        f"{ctx.fixture.get('away_team_name')}: NO AA en <b>{away_no}/{away_n}</b> últimos",
    ]
    h2h_factor = 1.0
    if ctx.h2h.matches >= MIN_H2H:
        h2h_no = ctx.h2h.matches - sum(
            1
            for fx in ctx.h2h.fixtures
            if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
        )
        h2h_factor = h2h_no / ctx.h2h.matches
        if h2h_factor < MIN_PATTERN_RATE:
            return None
        bullets.append(f"NO AA en <b>{h2h_no}/{ctx.h2h.matches}</b> H2H")

    strength = (home_no / home_n + away_no / away_n + h2h_factor) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{ctx.fixture.get('home_team_name')} vs {ctx.fixture.get('away_team_name')}",
        market="BTTS",
        outcome="btts_no",
        pattern_name="Defensas blindadas",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
    )


def _scan_over_2_5(ctx: MatchContext) -> Optional[PatternPick]:
    home_n = min(5, ctx.home_form.matches_considered)
    away_n = min(5, ctx.away_form.matches_considered)
    if home_n < MIN_LAST_N or away_n < MIN_LAST_N:
        return None
    home_over = ctx.home_form.over_2_5_in_last(5)
    away_over = ctx.away_form.over_2_5_in_last(5)
    if home_over / home_n < MIN_PATTERN_RATE or away_over / away_n < MIN_PATTERN_RATE:
        return None

    bullets = [
        f"{ctx.fixture.get('home_team_name')}: +2.5 en <b>{home_over}/{home_n}</b> últimos",
        f"{ctx.fixture.get('away_team_name')}: +2.5 en <b>{away_over}/{away_n}</b> últimos",
    ]
    h2h_factor = 1.0
    if ctx.h2h.matches >= MIN_H2H:
        h2h_over = sum(
            1
            for fx in ctx.h2h.fixtures
            if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
        )
        h2h_factor = h2h_over / ctx.h2h.matches
        if h2h_factor < MIN_PATTERN_RATE:
            return None
        bullets.append(f"+2.5 en <b>{h2h_over}/{ctx.h2h.matches}</b> H2H")

    strength = (home_over / home_n + away_over / away_n + h2h_factor) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{ctx.fixture.get('home_team_name')} vs {ctx.fixture.get('away_team_name')}",
        market="OVER_UNDER_2_5",
        outcome="over_2_5",
        pattern_name="Festival ofensivo",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
    )


def _scan_under_2_5(ctx: MatchContext) -> Optional[PatternPick]:
    home_n = min(5, ctx.home_form.matches_considered)
    away_n = min(5, ctx.away_form.matches_considered)
    if home_n < MIN_LAST_N or away_n < MIN_LAST_N:
        return None
    home_under = home_n - ctx.home_form.over_2_5_in_last(5)
    away_under = away_n - ctx.away_form.over_2_5_in_last(5)
    if home_under / home_n < MIN_PATTERN_RATE or away_under / away_n < MIN_PATTERN_RATE:
        return None

    bullets = [
        f"{ctx.fixture.get('home_team_name')}: −2.5 en <b>{home_under}/{home_n}</b> últimos",
        f"{ctx.fixture.get('away_team_name')}: −2.5 en <b>{away_under}/{away_n}</b> últimos",
    ]
    h2h_factor = 1.0
    if ctx.h2h.matches >= MIN_H2H:
        h2h_under = ctx.h2h.matches - sum(
            1
            for fx in ctx.h2h.fixtures
            if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
        )
        h2h_factor = h2h_under / ctx.h2h.matches
        if h2h_factor < MIN_PATTERN_RATE:
            return None
        bullets.append(f"−2.5 en <b>{h2h_under}/{ctx.h2h.matches}</b> H2H")

    strength = (home_under / home_n + away_under / away_n + h2h_factor) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{ctx.fixture.get('home_team_name')} vs {ctx.fixture.get('away_team_name')}",
        market="OVER_UNDER_2_5",
        outcome="under_2_5",
        pattern_name="Pocos goles",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
    )


def _scan_home_dominant(ctx: MatchContext) -> Optional[PatternPick]:
    home_wins_5 = ctx.home_form.wins_in_last(5)
    away_losses_5 = ctx.away_form.losses_in_last(5)
    home_n = min(5, ctx.home_form.matches_considered)
    away_n = min(5, ctx.away_form.matches_considered)
    if home_n < MIN_LAST_N or away_n < MIN_LAST_N:
        return None
    if home_wins_5 / home_n < MIN_PATTERN_RATE:
        return None
    if away_losses_5 / away_n < 0.6:  # softer for visitor losses
        return None

    bullets = [
        f"{ctx.fixture.get('home_team_name')} ha ganado <b>{home_wins_5}/{home_n}</b> últimos",
        f"{ctx.fixture.get('away_team_name')} ha perdido <b>{away_losses_5}/{away_n}</b> últimos",
    ]
    h2h_factor = 1.0
    if ctx.h2h.matches >= MIN_H2H:
        home_id = ctx.fixture.get("home_team_api_id") or 0
        h2h_home_wins = ctx.h2h.team_won_count(home_id)
        h2h_factor = h2h_home_wins / ctx.h2h.matches
        if h2h_factor >= 0.6:
            bullets.append(
                f"{ctx.fixture.get('home_team_name')} ganó <b>{h2h_home_wins}/{ctx.h2h.matches}</b> H2H"
            )
        else:
            return None

    strength = min(1.0, 0.5 * (home_wins_5 / home_n) + 0.3 * (away_losses_5 / away_n) + 0.2 * h2h_factor)
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{ctx.fixture.get('home_team_name')} vs {ctx.fixture.get('away_team_name')}",
        market="1X2",
        outcome="home_win",
        pattern_name="Local imparable",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
    )


def _scan_away_dominant(ctx: MatchContext) -> Optional[PatternPick]:
    away_wins_5 = ctx.away_form.wins_in_last(5)
    home_losses_5 = ctx.home_form.losses_in_last(5)
    home_n = min(5, ctx.home_form.matches_considered)
    away_n = min(5, ctx.away_form.matches_considered)
    if home_n < MIN_LAST_N or away_n < MIN_LAST_N:
        return None
    if away_wins_5 / away_n < MIN_PATTERN_RATE:
        return None
    if home_losses_5 / home_n < 0.6:
        return None

    bullets = [
        f"{ctx.fixture.get('away_team_name')} ha ganado <b>{away_wins_5}/{away_n}</b> últimos",
        f"{ctx.fixture.get('home_team_name')} ha perdido <b>{home_losses_5}/{home_n}</b> últimos",
    ]
    h2h_factor = 1.0
    if ctx.h2h.matches >= MIN_H2H:
        away_id = ctx.fixture.get("away_team_api_id") or 0
        h2h_away_wins = ctx.h2h.team_won_count(away_id)
        h2h_factor = h2h_away_wins / ctx.h2h.matches
        if h2h_factor >= 0.6:
            bullets.append(
                f"{ctx.fixture.get('away_team_name')} ganó <b>{h2h_away_wins}/{ctx.h2h.matches}</b> H2H"
            )
        else:
            return None

    strength = min(1.0, 0.5 * (away_wins_5 / away_n) + 0.3 * (home_losses_5 / home_n) + 0.2 * h2h_factor)
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{ctx.fixture.get('home_team_name')} vs {ctx.fixture.get('away_team_name')}",
        market="1X2",
        outcome="away_win",
        pattern_name="Visitante imparable",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


_SCANNERS = (
    _scan_btts_yes,
    _scan_btts_no,
    _scan_over_2_5,
    _scan_under_2_5,
    _scan_home_dominant,
    _scan_away_dominant,
)


def scan_patterns(ctx: MatchContext) -> List[PatternPick]:
    out: List[PatternPick] = []
    for scanner in _SCANNERS:
        try:
            pick = scanner(ctx)
        except Exception:
            logger.exception("Pattern scanner %s failed", scanner.__name__)
            continue
        if pick is not None:
            out.append(pick)
    return out


def attach_odds(pick: PatternPick, market_quotes: List[MarketQuote]) -> Optional[PatternPick]:
    """Find the best available odds for this pick from the supplied quotes
    (already filtered to the right fixture). Returns None when there is no
    matching market — pattern picks without odds are skipped because the
    tipster post needs a price to publish.
    """
    if not market_quotes:
        return None
    fair_quotes = devig_quotes(market_quotes)
    matched: List[FairQuote] = [
        fq for fq in fair_quotes if fq.market == pick.market and fq.outcome == pick.outcome
    ]
    if not matched:
        return None
    # Pick the bookmaker with the best (highest) odds for this outcome.
    best = max(matched, key=lambda fq: fq.decimal_odds)
    pick.bookmaker = best.bookmaker
    pick.decimal_odds = best.decimal_odds
    pick.fair_probability = best.fair_probability
    pick.recommended_stake_pct = PATTERN_STAKES.get(pick.confidence, 0.01)
    return pick
