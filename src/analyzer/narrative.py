"""Tipster-style narrative builder.

Given a value pick and a MatchContext, returns:
  - A short opening line (competition + hook)
  - 3-5 punchy bullets backed by real numbers from the context

Goals:
  - Speak like a human tipster, not a stats dump.
  - Every bullet is a fact, not opinion.
  - Mention the *number* whenever possible (rates, averages, counts).
  - Pick bullets that *support* the chosen outcome, not generic noise.
"""
from __future__ import annotations

from typing import List, Optional

from src.analyzer.match_context import MatchContext, TeamForm


def _name(fx: dict, side: str) -> str:
    key = "home_team_name" if side == "home" else "away_team_name"
    return fx.get(key) or "?"


def _streak_phrase(form: TeamForm, name: str) -> Optional[str]:
    s = form.streak
    if s >= 3:
        return f"{name} llega con <b>{s} victorias consecutivas</b>"
    if s <= -3:
        return f"{name} encadena <b>{abs(s)} derrotas consecutivas</b>"
    return None


def _form_phrase(form: TeamForm, name: str) -> Optional[str]:
    if form.matches_considered < 5:
        return None
    if form.wins >= 4:
        return f"{name}: <b>{form.wins}/{form.matches_considered}</b> victorias en sus últimos {form.matches_considered}"
    if form.wins == 0 and form.matches_considered >= 5:
        return f"{name} no gana en sus últimos <b>{form.matches_considered}</b> partidos"
    return None


def _opening_line(ctx: MatchContext) -> str:
    fx = ctx.fixture
    league = fx.get("league_name") or "fútbol"
    home = _name(fx, "home")
    away = _name(fx, "away")

    s_h = ctx.home_form.streak
    s_a = ctx.away_form.streak
    if s_h >= 3 and s_a <= -2:
        return f"{home} en racha 🔥 vs {away} en horas bajas — {league}."
    if s_a >= 3 and s_h <= -2:
        return f"{away} llega disparado a visitar a {home} — {league}."
    if ctx.h2h.matches >= 3 and (ctx.h2h.team_a_wins >= ctx.h2h.matches - 1 or ctx.h2h.team_b_wins >= ctx.h2h.matches - 1):
        return f"Duelo con histórico marcado en {league}."
    return f"Choque interesante en {league} 🔥"


# ---------------------------------------------------------------------------
# Pick-specific bullet builders
# ---------------------------------------------------------------------------


def _bullets_1x2(ctx: MatchContext, outcome: str) -> List[str]:
    fx = ctx.fixture
    home = _name(fx, "home")
    away = _name(fx, "away")
    bullets: List[str] = []

    if outcome == "home_win":
        if (s := _streak_phrase(ctx.home_form, home)):
            bullets.append(s)
        if ctx.home_form.avg_goals_for - ctx.home_form.avg_goals_against >= 0.7:
            bullets.append(
                f"{home} promedia <b>{ctx.home_form.avg_goals_for:.1f}</b> goles a favor "
                f"y solo <b>{ctx.home_form.avg_goals_against:.1f}</b> en contra (últimos 10)"
            )
        if ctx.away_form.avg_goals_against >= 1.5:
            bullets.append(
                f"{away} encaja <b>{ctx.away_form.avg_goals_against:.1f}</b> goles por partido fuera"
            )
        if ctx.h2h.matches >= 3 and ctx.h2h.team_a_wins >= max(2, ctx.h2h.matches // 2):
            bullets.append(
                f"En los últimos {ctx.h2h.matches} H2H, <b>{home} ganó {ctx.h2h.team_a_wins}</b>"
            )

    elif outcome == "away_win":
        if (s := _streak_phrase(ctx.away_form, away)):
            bullets.append(s)
        if ctx.away_form.avg_goals_for - ctx.away_form.avg_goals_against >= 0.7:
            bullets.append(
                f"{away} promedia <b>{ctx.away_form.avg_goals_for:.1f}</b> goles a favor "
                f"y <b>{ctx.away_form.avg_goals_against:.1f}</b> en contra (últimos 10)"
            )
        if ctx.home_form.avg_goals_against >= 1.5:
            bullets.append(
                f"{home} encaja <b>{ctx.home_form.avg_goals_against:.1f}</b> goles por partido en casa"
            )
        if ctx.h2h.matches >= 3 and ctx.h2h.team_b_wins >= max(2, ctx.h2h.matches // 2):
            bullets.append(
                f"En los últimos {ctx.h2h.matches} H2H, <b>{away} ganó {ctx.h2h.team_b_wins}</b>"
            )

    else:  # draw
        if ctx.h2h.draws >= max(2, ctx.h2h.matches // 2):
            bullets.append(
                f"<b>{ctx.h2h.draws}/{ctx.h2h.matches}</b> empates en los últimos H2H"
            )
        if abs(ctx.home_form.avg_goals_for - ctx.away_form.avg_goals_for) < 0.3:
            bullets.append("Equipos muy igualados en goles a favor (últimos 10)")

    return bullets


def _bullets_btts(ctx: MatchContext, outcome: str) -> List[str]:
    fx = ctx.fixture
    home = _name(fx, "home")
    away = _name(fx, "away")
    bullets: List[str] = []

    h_btts = ctx.home_form.btts_rate
    a_btts = ctx.away_form.btts_rate

    if outcome == "btts_yes":
        if ctx.h2h.matches >= 3:
            n = round(ctx.h2h.btts_rate * ctx.h2h.matches)
            if ctx.h2h.btts_rate >= 0.6:
                bullets.append(
                    f"En sus últimos {ctx.h2h.matches} H2H se ha dado el <b>AA en {n}/{ctx.h2h.matches}</b>"
                )
        if h_btts >= 0.6:
            bullets.append(f"{home}: AA en <b>{h_btts*100:.0f}%</b> de sus últimos partidos")
        if a_btts >= 0.6:
            bullets.append(f"{away}: AA en <b>{a_btts*100:.0f}%</b> de sus últimos partidos")
        if ctx.home_form.avg_goals_for >= 1.3 and ctx.away_form.avg_goals_for >= 1.3:
            bullets.append(
                f"Ambos marcan con regularidad: {home} {ctx.home_form.avg_goals_for:.1f} g/p, "
                f"{away} {ctx.away_form.avg_goals_for:.1f} g/p"
            )
    else:  # btts_no
        if ctx.h2h.btts_rate <= 0.4 and ctx.h2h.matches >= 3:
            n = round((1 - ctx.h2h.btts_rate) * ctx.h2h.matches)
            bullets.append(f"<b>{n}/{ctx.h2h.matches}</b> de sus últimos H2H sin AA")
        if ctx.home_form.clean_sheets + ctx.away_form.clean_sheets >= 6:
            bullets.append(
                f"Combinan <b>{ctx.home_form.clean_sheets + ctx.away_form.clean_sheets}</b> "
                f"porterías a cero en sus últimos 20 partidos"
            )
        if ctx.home_form.avg_goals_for < 1.0 or ctx.away_form.avg_goals_for < 1.0:
            bullets.append(
                f"Ofensivas flojas: {home} {ctx.home_form.avg_goals_for:.1f} g/p, "
                f"{away} {ctx.away_form.avg_goals_for:.1f} g/p"
            )
    return bullets


def _bullets_ou_2_5(ctx: MatchContext, outcome: str) -> List[str]:
    fx = ctx.fixture
    home = _name(fx, "home")
    away = _name(fx, "away")
    bullets: List[str] = []

    total_avg = (
        ctx.home_form.avg_goals_for + ctx.home_form.avg_goals_against
        + ctx.away_form.avg_goals_for + ctx.away_form.avg_goals_against
    ) / 2

    h_o25 = ctx.home_form.over_2_5_rate
    a_o25 = ctx.away_form.over_2_5_rate

    if outcome == "over_2_5":
        bullets.append(f"Promedio combinado: <b>{total_avg:.1f}</b> goles por partido (últimos 10)")
        if ctx.h2h.over_2_5_rate >= 0.6 and ctx.h2h.matches >= 3:
            n = round(ctx.h2h.over_2_5_rate * ctx.h2h.matches)
            bullets.append(f"<b>+2.5 goles en {n}/{ctx.h2h.matches}</b> de sus últimos H2H")
        if h_o25 >= 0.6 and a_o25 >= 0.6:
            bullets.append(
                f"{home} ve +2.5 en <b>{h_o25*100:.0f}%</b> · {away} en <b>{a_o25*100:.0f}%</b>"
            )
    else:  # under_2_5
        if total_avg <= 2.4:
            bullets.append(f"Promedio combinado bajo: <b>{total_avg:.1f}</b> goles por partido")
        if ctx.h2h.over_2_5_rate <= 0.4 and ctx.h2h.matches >= 3:
            n = round((1 - ctx.h2h.over_2_5_rate) * ctx.h2h.matches)
            bullets.append(f"<b>{n}/{ctx.h2h.matches}</b> H2H quedaron por debajo de 2.5 goles")
        if ctx.home_form.avg_goals_against + ctx.away_form.avg_goals_against <= 2.0:
            bullets.append("Ambos defienden muy bien: pocos goles encajados")
    return bullets


def _xg_bullet(ctx: MatchContext, outcome: str) -> Optional[str]:
    fx = ctx.fixture
    home = _name(fx, "home")
    away = _name(fx, "away")
    if outcome == "home_win" and ctx.home_form.xg_for and ctx.away_form.xg_against:
        if ctx.home_form.avg_xg_for - ctx.away_form.avg_xg_against > 0.4:
            return (
                f"xG: {home} produce <b>{ctx.home_form.avg_xg_for:.2f}</b> · "
                f"{away} permite <b>{ctx.away_form.avg_xg_against:.2f}</b>"
            )
    if outcome == "away_win" and ctx.away_form.xg_for and ctx.home_form.xg_against:
        if ctx.away_form.avg_xg_for - ctx.home_form.avg_xg_against > 0.4:
            return (
                f"xG: {away} produce <b>{ctx.away_form.avg_xg_for:.2f}</b> · "
                f"{home} permite <b>{ctx.home_form.avg_xg_against:.2f}</b>"
            )
    return None


def build_narrative(ctx: MatchContext, market: str, outcome: str, max_bullets: int = 4) -> dict:
    """Return {opening, bullets} for a chosen pick. opening is one short
    sentence; bullets is a list of strings already wrapped in <b> for
    Telegram HTML rendering."""
    bullets: List[str] = []

    if market == "1X2":
        bullets.extend(_bullets_1x2(ctx, outcome))
        if (xg := _xg_bullet(ctx, outcome)):
            bullets.append(xg)
    elif market == "BTTS":
        bullets.extend(_bullets_btts(ctx, outcome))
    elif market == "OVER_UNDER_2_5":
        bullets.extend(_bullets_ou_2_5(ctx, outcome))

    # Generic fallback bullet so we always say something
    if not bullets:
        if ctx.home_form.matches_considered:
            home = _name(ctx.fixture, "home")
            bullets.append(
                f"{home} promedia {ctx.home_form.avg_goals_for:.1f} - "
                f"{ctx.home_form.avg_goals_against:.1f} en sus últimos {ctx.home_form.matches_considered}"
            )

    # De-dup while preserving order, cap.
    seen = set()
    unique: List[str] = []
    for b in bullets:
        if b not in seen:
            seen.add(b)
            unique.append(b)
        if len(unique) >= max_bullets:
            break

    return {
        "opening": _opening_line(ctx),
        "bullets": unique,
    }
