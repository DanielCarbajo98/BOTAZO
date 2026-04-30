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
    """AA Sí — strict, complementary.

    Requires BOTH teams to:
      - score in 9/10 last (proves they create goals)
      - concede in 9/10 last (proves they leak goals)
    AND in all 5 H2H both teams scored.
    """
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None

    home_scored = ctx.home_form.scored_in_last(LAST_N)
    home_conceded = ctx.home_form.conceded_in_last(LAST_N)
    away_scored = ctx.away_form.scored_in_last(LAST_N)
    away_conceded = ctx.away_form.conceded_in_last(LAST_N)

    if (
        home_scored / LAST_N < MIN_FORM_RATE
        or home_conceded / LAST_N < MIN_FORM_RATE
        or away_scored / LAST_N < MIN_FORM_RATE
        or away_conceded / LAST_N < MIN_FORM_RATE
    ):
        return None

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    bullets = [
        f"<b>{home}</b> ha marcado en <b>{home_scored}/{LAST_N}</b> y encajado en "
        f"<b>{home_conceded}/{LAST_N}</b> de sus últimos partidos. "
        f"Promedio: <b>{h_for:.1f}</b> a favor, <b>{h_ag:.1f}</b> en contra.",
        f"<b>{away}</b> ha marcado en <b>{away_scored}/{LAST_N}</b> y encajado en "
        f"<b>{away_conceded}/{LAST_N}</b> de los suyos. "
        f"Promedio: <b>{a_for:.1f}</b> a favor, <b>{a_ag:.1f}</b> en contra.",
    ]

    # STRICT H2H: 5/5 must be BTTS yes (both scored)
    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_btts = sum(
        1
        for fx in ctx.h2h.fixtures
        if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
    )
    if h2h_btts / ctx.h2h.matches < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En sus últimos <b>{ctx.h2h.matches}</b> H2H, AMBOS marcaron en los <b>{h2h_btts}</b> "
        f"— ni un solo partido sin AA."
    )

    rate_avg = (home_scored + home_conceded + away_scored + away_conceded) / (4 * LAST_N)
    strength = (rate_avg + 1.0) / 2  # average of form rate and perfect H2H
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
    """AA No — strict, complementary.

    Requires BOTH teams to NOT see BTTS in 9/10 last AND in all 5 H2H
    not have BTTS. Stronger if averages also low.
    """
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_no = LAST_N - ctx.home_form.btts_in_last(LAST_N)
    away_no = LAST_N - ctx.away_form.btts_in_last(LAST_N)
    if home_no / LAST_N < MIN_FORM_RATE or away_no / LAST_N < MIN_FORM_RATE:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    bullets = [
        f"<b>{home}</b> ha cerrado el AA en <b>{home_no}/{LAST_N}</b> partidos: "
        f"promedio bajo de <b>{h_for:.1f}</b> goles a favor y <b>{h_ag:.1f}</b> en contra.",
        f"<b>{away}</b> también juega cerrado: NO AA en <b>{away_no}/{LAST_N}</b>, "
        f"con <b>{a_for:.1f}</b> y <b>{a_ag:.1f}</b> de promedios.",
    ]

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_no = ctx.h2h.matches - sum(
        1
        for fx in ctx.h2h.fixtures
        if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
    )
    if h2h_no / ctx.h2h.matches < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> H2H, NO se dio el AA "
        f"<b>ni una sola vez</b>."
    )

    strength = (home_no / LAST_N + away_no / LAST_N + 1.0) / 3
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
    """+2.5 — strict, complementary.

    Requires BOTH teams to:
      - score in 9/10 last (offensive force)
      - concede in 9/10 last (defense leaks)
      - see 9/10 over 2.5
    AND in all 5 H2H over 2.5.
    """
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_over = ctx.home_form.over_2_5_in_last(LAST_N)
    away_over = ctx.away_form.over_2_5_in_last(LAST_N)
    home_scored = ctx.home_form.scored_in_last(LAST_N)
    home_conceded = ctx.home_form.conceded_in_last(LAST_N)
    away_scored = ctx.away_form.scored_in_last(LAST_N)
    away_conceded = ctx.away_form.conceded_in_last(LAST_N)

    if (
        home_over / LAST_N < MIN_FORM_RATE
        or away_over / LAST_N < MIN_FORM_RATE
        or home_scored / LAST_N < MIN_FORM_RATE
        or away_scored / LAST_N < MIN_FORM_RATE
        or home_conceded / LAST_N < MIN_FORM_RATE
        or away_conceded / LAST_N < MIN_FORM_RATE
    ):
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_total = ctx.home_form.avg_goals_for + ctx.home_form.avg_goals_against
    a_total = ctx.away_form.avg_goals_for + ctx.away_form.avg_goals_against
    combined = (h_total + a_total) / 2

    bullets = [
        f"<b>{home}</b> firma <b>{home_over}/{LAST_N}</b> partidos con +2.5 goles, "
        f"con un combinado de <b>{h_total:.1f}</b> goles por encuentro.",
        f"<b>{away}</b> también ataca y se le ataca: <b>{away_over}/{LAST_N}</b> con +2.5, "
        f"combinado de <b>{a_total:.1f}</b> goles por partido.",
        f"Los dos marcan y encajan: combinado entre ambos de <b>{combined:.1f}</b> goles por partido.",
    ]

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_over = sum(
        1
        for fx in ctx.h2h.fixtures
        if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
    )
    if h2h_over / ctx.h2h.matches < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> H2H, los <b>{h2h_over}</b> superaron 2.5 goles."
    )

    strength = (home_over / LAST_N + away_over / LAST_N + 1.0) / 3
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
    """−2.5 — strict, complementary.

    Requires BOTH teams to:
      - see 9/10 under 2.5
      - have low combined averages (defense + low offense)
    AND in all 5 H2H under 2.5.
    """
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_under = LAST_N - ctx.home_form.over_2_5_in_last(LAST_N)
    away_under = LAST_N - ctx.away_form.over_2_5_in_last(LAST_N)
    if home_under / LAST_N < MIN_FORM_RATE or away_under / LAST_N < MIN_FORM_RATE:
        return None

    # Complementary check: at least one of (offense weak) or (defense strong) for each team.
    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against
    if (h_for + h_ag) > 2.5 or (a_for + a_ag) > 2.5:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    bullets = [
        f"<b>{home}</b>: −2.5 goles en <b>{home_under}/{LAST_N}</b>. "
        f"Promedio bajo: <b>{h_for:.1f}</b> a favor, <b>{h_ag:.1f}</b> en contra.",
        f"<b>{away}</b>: −2.5 en <b>{away_under}/{LAST_N}</b>. "
        f"Promedio: <b>{a_for:.1f}</b> a favor, <b>{a_ag:.1f}</b> en contra.",
        f"Ambas defensas aprietan: encajan <b>{h_ag:.1f}</b> y <b>{a_ag:.1f}</b> "
        f"goles por partido respectivamente.",
    ]

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    h2h_under = ctx.h2h.matches - sum(
        1
        for fx in ctx.h2h.fixtures
        if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
    )
    if h2h_under / ctx.h2h.matches < MIN_H2H_RATE:
        return None
    bullets.append(
        f"En los últimos <b>{ctx.h2h.matches}</b> H2H, los <b>{h2h_under}</b> "
        f"quedaron por debajo de 2.5 goles."
    )

    strength = (home_under / LAST_N + away_under / LAST_N + 1.0) / 3
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
    """Local imparable — strict, complementary.

    Requires:
      - Home wins 9/10 last
      - Home scored in 9/10 last (offense fires)
      - Away losses 8/10 last
      - Away conceded in 9/10 last (defense leaks)
      - 5/5 H2H home wins
    """
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    home_wins = ctx.home_form.wins_in_last(LAST_N)
    away_losses = ctx.away_form.losses_in_last(LAST_N)
    home_scored = ctx.home_form.scored_in_last(LAST_N)
    away_conceded = ctx.away_form.conceded_in_last(LAST_N)

    if home_wins / LAST_N < MIN_FORM_RATE:
        return None
    if home_scored / LAST_N < MIN_FORM_RATE:   # complementary: home actually scores
        return None
    if away_losses / LAST_N < 0.8:             # away losing form too
        return None
    if away_conceded / LAST_N < MIN_FORM_RATE: # complementary: away actually concedes
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    bullets = [
        f"<b>{home}</b> imparable: <b>{home_wins}/{LAST_N}</b> victorias, "
        f"marcando en <b>{home_scored}/{LAST_N}</b> "
        f"(<b>{h_for:.1f}</b> goles a favor, <b>{h_ag:.1f}</b> en contra).",
        f"<b>{away}</b> en horas bajas: <b>{away_losses}/{LAST_N}</b> derrotas, "
        f"encajando en <b>{away_conceded}/{LAST_N}</b> "
        f"(<b>{a_for:.1f}</b> goles a favor, <b>{a_ag:.1f}</b> en contra).",
    ]

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    home_id = ctx.fixture.get("home_team_api_id") or 0
    h2h_home_wins = ctx.h2h.team_won_count(home_id)
    if h2h_home_wins / ctx.h2h.matches < MIN_H2H_RATE:
        return None
    bullets.append(
        f"Histórico H2H demoledor: <b>{home}</b> ha ganado los <b>{h2h_home_wins}/{ctx.h2h.matches}</b> "
        f"últimos enfrentamientos directos."
    )

    strength = min(1.0, 0.4 * (home_wins / LAST_N) + 0.2 * (home_scored / LAST_N)
                   + 0.15 * (away_losses / LAST_N) + 0.15 * (away_conceded / LAST_N) + 0.1)
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
    """Visitante imparable — strict, complementary. Mirror of home_dominant."""
    if ctx.home_form.matches_considered < LAST_N or ctx.away_form.matches_considered < LAST_N:
        return None
    away_wins = ctx.away_form.wins_in_last(LAST_N)
    home_losses = ctx.home_form.losses_in_last(LAST_N)
    away_scored = ctx.away_form.scored_in_last(LAST_N)
    home_conceded = ctx.home_form.conceded_in_last(LAST_N)

    if away_wins / LAST_N < MIN_FORM_RATE:
        return None
    if away_scored / LAST_N < MIN_FORM_RATE:
        return None
    if home_losses / LAST_N < 0.8:
        return None
    if home_conceded / LAST_N < MIN_FORM_RATE:
        return None

    home = ctx.fixture.get("home_team_name") or "?"
    away = ctx.fixture.get("away_team_name") or "?"
    league = ctx.fixture.get("league_name") or "fútbol"

    h_for = ctx.home_form.avg_goals_for
    h_ag = ctx.home_form.avg_goals_against
    a_for = ctx.away_form.avg_goals_for
    a_ag = ctx.away_form.avg_goals_against

    bullets = [
        f"<b>{away}</b> lanzado: <b>{away_wins}/{LAST_N}</b> victorias, "
        f"marcando en <b>{away_scored}/{LAST_N}</b> "
        f"(<b>{a_for:.1f}</b> goles a favor, <b>{a_ag:.1f}</b> en contra).",
        f"<b>{home}</b> floja en casa: <b>{home_losses}/{LAST_N}</b> derrotas, "
        f"encajando en <b>{home_conceded}/{LAST_N}</b> "
        f"(<b>{h_for:.1f}</b> goles a favor, <b>{h_ag:.1f}</b> en contra).",
    ]

    if ctx.h2h.matches < REQUIRED_H2H:
        return None
    away_id = ctx.fixture.get("away_team_api_id") or 0
    h2h_away_wins = ctx.h2h.team_won_count(away_id)
    if h2h_away_wins / ctx.h2h.matches < MIN_H2H_RATE:
        return None
    bullets.append(
        f"Histórico H2H demoledor: <b>{away}</b> ha ganado los <b>{h2h_away_wins}/{ctx.h2h.matches}</b> "
        f"últimos enfrentamientos directos."
    )

    strength = min(1.0, 0.4 * (away_wins / LAST_N) + 0.2 * (away_scored / LAST_N)
                   + 0.15 * (home_losses / LAST_N) + 0.15 * (home_conceded / LAST_N) + 0.1)
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
