"""Pattern-based pick scanner — strict mode.

Only emits a pick when the same statistical pattern repeats in:
  * AT LEAST 9 of the last 10 matches per team (90% form)
  * AT LEAST 5 head-to-head matches available
  * ALL of those last 5 H2H confirm the pattern (100% match)

This is intentionally aggressive: most fixtures will fail the H2H gate
because we don't always have 5 historical encounters with scores.
That's the trade-off for high-precision tipster picks.
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

LAST_N = 10                      # team form window
H2H_N = 5                        # head-to-head window
MIN_FORM_RATE = 0.9              # >= 9/10 last matches confirm
REQUIRED_H2H = 5                 # must have at least 5 H2H matches
MIN_H2H_RATE = 1.0               # ALL 5 H2H must confirm
MAX_BULLETS = 4

PATTERN_STAKES = {
    "alta": 0.025,
    "media": 0.015,
    "baja": 0.010,
}


@dataclass
class PatternPick:
    fixture_api_id: int
    match_label: str
    home_team: str
    away_team: str
    league: str
    market: str
    outcome: str
    pattern_name: str
    pattern_strength: float
    confidence: str
    bullets: List[str]
    opening: str = ""
    bookmaker: Optional[str] = None
    decimal_odds: Optional[float] = None
    fair_probability: Optional[float] = None
    recommended_stake_pct: float = 0.0

    def as_display(self) -> dict:
        return {
            "fixture_api_id": self.fixture_api_id,
            "match_label": self.match_label,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "league": self.league,
            "market": self.market,
            "outcome": self.outcome,
            "pattern_name": self.pattern_name,
            "pattern_strength": self.pattern_strength,
            "confidence": self.confidence,
            "bullets": self.bullets,
            "opening": self.opening,
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
# Pattern detectors — each returns PatternPick or None.
# ---------------------------------------------------------------------------


def _strength_to_confidence(strength: float) -> str:
    if strength >= 0.9:
        return "alta"
    if strength >= 0.8:
        return "media"
    return "baja"


def _scan_btts_yes(ctx: MatchContext) -> Optional[PatternPick]:
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None

    home_btts = ctx.home_form.btts_in_last(LAST_N)
    away_btts = ctx.away_form.btts_in_last(LAST_N)
    if home_btts / LAST_N < MIN_FORM_RATE or away_btts / LAST_N < MIN_FORM_RATE:
        return None

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    bullets = [
        f"<b>{home}</b> ha visto Ambos Anotan en <b>{home_btts}/{LAST_N}</b> de sus últimos partidos, "
        f"con un promedio de <b>{h_for:.1f}</b> goles a favor y <b>{h_ag:.1f}</b> en contra.",
        f"<b>{away}</b> también marca y encaja con regularidad: AA en <b>{away_btts}/{LAST_N}</b>, "
        f"promedio <b>{a_for:.1f}</b> a favor y <b>{a_ag:.1f}</b> en contra.",
    ]

    # STRICT H2H GATE: must have at least REQUIRED_H2H past matches
    # AND every single one of them must confirm the pattern.
    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_btts = sum(
        1
        for fx in ctx.h2h.fixtures
        if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
    )
    h2h_rate = h2h_btts / ctx.h2h.matches
    if h2h_rate < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> enfrentamientos directos se ha dado el AA en "
        f"los <b>{h2h_btts} ({h2h_rate*100:.0f}%)</b> — patrón perfecto."
    )

    strength = (home_btts / LAST_N + away_btts / LAST_N + h2h_rate) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{home} vs {away}",
        home_team=home,
        away_team=away,
        league=league,
        market="BTTS",
        outcome="btts_yes",
        pattern_name="Doble racha de Ambos Anotan",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
        opening=f"Dos máquinas de marcar y encajar se cruzan en {league} 🔥",
    )


def _scan_btts_no(ctx: MatchContext) -> Optional[PatternPick]:
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_no = LAST_N - ctx.home_form.btts_in_last(LAST_N)
    away_no = LAST_N - ctx.away_form.btts_in_last(LAST_N)
    if home_no / LAST_N < MIN_FORM_RATE or away_no / LAST_N < MIN_FORM_RATE:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    cs_h = ctx.home_form.clean_sheets
    cs_a = ctx.away_form.clean_sheets
    h_for = ctx.home_form.avg_goals_for
    a_for = ctx.away_form.avg_goals_for

    bullets = [
        f"<b>{home}</b> mantiene el AA fuera del marcador en <b>{home_no}/{LAST_N}</b> "
        f"de sus últimos partidos. Solo promedia <b>{h_for:.1f}</b> goles a favor por encuentro.",
        f"<b>{away}</b> también juega partidos cerrados: NO AA en <b>{away_no}/{LAST_N}</b>, "
        f"promedio ofensivo bajo de <b>{a_for:.1f}</b> goles.",
    ]
    if cs_h + cs_a >= 6:
        bullets.append(
            f"Entre ambos suman <b>{cs_h + cs_a}</b> porterías a cero en los últimos {LAST_N*2} partidos."
        )

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_no = ctx.h2h.matches - sum(
        1
        for fx in ctx.h2h.fixtures
        if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
    )
    h2h_rate = h2h_no / ctx.h2h.matches
    if h2h_rate < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> H2H, NO se dio el AA ni una sola vez "
        f"<b>({h2h_no}/{ctx.h2h.matches})</b>."
    )

    strength = (home_no / LAST_N + away_no / LAST_N + h2h_rate) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{home} vs {away}",
        home_team=home,
        away_team=away,
        league=league,
        market="BTTS",
        outcome="btts_no",
        pattern_name="Defensas blindadas",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
        opening=f"Dos defensas duras chocan en {league} 🛡️",
    )


def _scan_over_2_5(ctx: MatchContext) -> Optional[PatternPick]:
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_over = ctx.home_form.over_2_5_in_last(LAST_N)
    away_over = ctx.away_form.over_2_5_in_last(LAST_N)
    if home_over / LAST_N < MIN_FORM_RATE or away_over / LAST_N < MIN_FORM_RATE:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_total = ctx.home_form.avg_goals_for + ctx.home_form.avg_goals_against
    a_total = ctx.away_form.avg_goals_for + ctx.away_form.avg_goals_against
    combined_avg = (h_total + a_total) / 2

    bullets = [
        f"<b>{home}</b> ha visto +2.5 goles en <b>{home_over}/{LAST_N}</b> de sus últimos partidos, "
        f"con una media combinada de <b>{h_total:.1f}</b> goles por encuentro.",
        f"<b>{away}</b> también firma partidos abiertos: +2.5 en <b>{away_over}/{LAST_N}</b>, "
        f"media de <b>{a_total:.1f}</b> goles por partido.",
        f"Promedio combinado entre ambos: <b>{combined_avg:.1f} goles</b> por partido en sus últimos {LAST_N}.",
    ]

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_over = sum(
        1
        for fx in ctx.h2h.fixtures
        if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
    )
    h2h_rate = h2h_over / ctx.h2h.matches
    if h2h_rate < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> H2H se ha superado el +2.5 goles en "
        f"<b>{h2h_over}/{ctx.h2h.matches}</b> — siempre."
    )

    strength = (home_over / LAST_N + away_over / LAST_N + h2h_rate) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{home} vs {away}",
        home_team=home,
        away_team=away,
        league=league,
        market="OVER_UNDER_2_5",
        outcome="over_2_5",
        pattern_name="Festival ofensivo",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
        opening=f"Dos equipos que firman partidos de muchos goles en {league} ⚡",
    )


def _scan_under_2_5(ctx: MatchContext) -> Optional[PatternPick]:
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_under = LAST_N - ctx.home_form.over_2_5_in_last(LAST_N)
    away_under = LAST_N - ctx.away_form.over_2_5_in_last(LAST_N)
    if home_under / LAST_N < MIN_FORM_RATE or away_under / LAST_N < MIN_FORM_RATE:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_total = ctx.home_form.avg_goals_for + ctx.home_form.avg_goals_against
    a_total = ctx.away_form.avg_goals_for + ctx.away_form.avg_goals_against

    bullets = [
        f"<b>{home}</b>: −2.5 goles en <b>{home_under}/{LAST_N}</b> últimos partidos. "
        f"Media combinada de solo <b>{h_total:.1f}</b> goles por encuentro.",
        f"<b>{away}</b> también disputa partidos cerrados: −2.5 en <b>{away_under}/{LAST_N}</b>, "
        f"media de <b>{a_total:.1f}</b> goles por partido.",
    ]
    if ctx.home_form.avg_goals_against + ctx.away_form.avg_goals_against <= 2.0:
        bullets.append(
            f"Defensas sólidas: encajan <b>{ctx.home_form.avg_goals_against:.1f}</b> y "
            f"<b>{ctx.away_form.avg_goals_against:.1f}</b> goles por partido respectivamente."
        )

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_under = ctx.h2h.matches - sum(
        1
        for fx in ctx.h2h.fixtures
        if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
    )
    h2h_rate = h2h_under / ctx.h2h.matches
    if h2h_rate < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> H2H, los <b>{h2h_under}/{ctx.h2h.matches}</b> "
        f"quedaron por debajo de 2.5 goles — patrón perfecto."
    )

    strength = (home_under / LAST_N + away_under / LAST_N + h2h_rate) / 3
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{home} vs {away}",
        home_team=home,
        away_team=away,
        league=league,
        market="OVER_UNDER_2_5",
        outcome="under_2_5",
        pattern_name="Pocos goles",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
        opening=f"Dos equipos que aprietan al rival en {league} 🛡️",
    )


def _scan_home_dominant(ctx: MatchContext) -> Optional[PatternPick]:
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_wins = ctx.home_form.wins_in_last(LAST_N)
    away_losses = ctx.away_form.losses_in_last(LAST_N)
    if home_wins / LAST_N < MIN_FORM_RATE:
        return None
    if away_losses / LAST_N < 0.5:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    bullets = [
        f"<b>{home}</b> llega imparable con <b>{home_wins} victorias en sus últimos {LAST_N} partidos</b>, "
        f"anotando <b>{h_for:.1f}</b> goles por encuentro y encajando solo <b>{h_ag:.1f}</b>.",
        f"<b>{away}</b> arrastra una mala racha con <b>{away_losses} derrotas en sus últimos {LAST_N}</b>, "
        f"con apenas <b>{a_for:.1f}</b> goles a favor y <b>{a_ag:.1f}</b> en contra de media.",
    ]
    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    home_id = ctx.fixture.get("home_team_api_id") or 0
    h2h_home_wins = ctx.h2h.team_won_count(home_id)
    h2h_rate = h2h_home_wins / ctx.h2h.matches
    if h2h_rate < MIN_H2H_RATE:
        return None
    bullets.append(
        f"Histórico H2H demoledor: <b>{home}</b> ha ganado los <b>{h2h_home_wins}/{ctx.h2h.matches}</b> "
        f"últimos enfrentamientos directos."
    )

    strength = min(1.0, 0.5 * (home_wins / LAST_N) + 0.3 * (away_losses / LAST_N) + 0.2 * h2h_rate)
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{home} vs {away}",
        home_team=home,
        away_team=away,
        league=league,
        market="1X2",
        outcome="home_win",
        pattern_name="Local imparable",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
        opening=f"{home} en racha 🔥 vs {away} en horas bajas — {league}.",
    )


def _scan_away_dominant(ctx: MatchContext) -> Optional[PatternPick]:
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    away_wins = ctx.away_form.wins_in_last(LAST_N)
    home_losses = ctx.home_form.losses_in_last(LAST_N)
    if away_wins / LAST_N < MIN_FORM_RATE:
        return None
    if home_losses / LAST_N < 0.5:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    bullets = [
        f"<b>{away}</b> llega lanzado: <b>{away_wins} victorias en sus últimos {LAST_N} partidos</b>, "
        f"anotando <b>{a_for:.1f}</b> goles por encuentro y encajando <b>{a_ag:.1f}</b>.",
        f"<b>{home}</b> arrastra una mala racha en casa: <b>{home_losses} derrotas en sus últimos {LAST_N}</b>, "
        f"con <b>{h_for:.1f}</b> goles a favor y <b>{h_ag:.1f}</b> en contra de media.",
    ]
    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    away_id = ctx.fixture.get("away_team_api_id") or 0
    h2h_away_wins = ctx.h2h.team_won_count(away_id)
    h2h_rate = h2h_away_wins / ctx.h2h.matches
    if h2h_rate < MIN_H2H_RATE:
        return None
    bullets.append(
        f"Histórico H2H demoledor: <b>{away}</b> ha ganado los <b>{h2h_away_wins}/{ctx.h2h.matches}</b> "
        f"últimos enfrentamientos directos."
    )

    strength = min(1.0, 0.5 * (away_wins / LAST_N) + 0.3 * (home_losses / LAST_N) + 0.2 * h2h_rate)
    return PatternPick(
        fixture_api_id=ctx.fixture.get("api_id") or 0,
        match_label=f"{home} vs {away}",
        home_team=home,
        away_team=away,
        league=league,
        market="1X2",
        outcome="away_win",
        pattern_name="Visitante imparable",
        pattern_strength=strength,
        confidence=_strength_to_confidence(strength),
        bullets=bullets[:MAX_BULLETS],
        opening=f"{away} llega disparado a visitar a {home} — {league}.",
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
    if not market_quotes:
        return None
    fair_quotes = devig_quotes(market_quotes)
    matched: List[FairQuote] = [
        fq for fq in fair_quotes if fq.market == pick.market and fq.outcome == pick.outcome
    ]
    if not matched:
        return None
    best = max(matched, key=lambda fq: fq.decimal_odds)
    pick.bookmaker = best.bookmaker
    pick.decimal_odds = best.decimal_odds
    pick.fair_probability = best.fair_probability
    pick.recommended_stake_pct = PATTERN_STAKES.get(pick.confidence, 0.01)
    return pick
