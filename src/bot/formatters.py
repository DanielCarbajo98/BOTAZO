"""Telegram message formatters.

We use HTML parse mode (instead of Markdown) because team names and league
names sometimes contain underscores or asterisks that would break Markdown
without manual escaping. HTML only requires escaping <, > and &.

Visual conventions:
  ━━━━━━━━━  is the section divider (16 box-drawing chars)
  📌 / 💰 / 📊 / 💵 / ⭐ / ⚽ / 🕘 / 📍 are functional anchors,
  not decoration — they make the message scannable on a phone.
"""
from __future__ import annotations

from datetime import datetime
from typing import Iterable, List, Optional

DIVIDER = "━━━━━━━━━━━━━━━━━━━━"


def _esc(s: object) -> str:
    """HTML-escape a value for safe insertion."""
    text = "" if s is None else str(s)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _pct(p: float) -> str:
    return f"{p * 100:.0f}%"


def _kickoff(date_iso: str) -> str:
    try:
        return datetime.fromisoformat(date_iso).strftime("%H:%M")
    except (ValueError, TypeError):
        return "--:--"


# ---------------------------------------------------------------------------
# Static messages
# ---------------------------------------------------------------------------


def welcome_message() -> str:
    return (
        "🎯 <b>Audiobet</b>\n"
        "Análisis de fútbol y detección de value bets.\n"
        "\n"
        "<b>Comandos:</b>\n"
        "• /hoy — partidos de hoy con predicciones\n"
        "• /manana — partidos de mañana\n"
        "• /partidos N — partidos en N días\n"
        "• /tenis — partidos de tenis en torneos activos\n"
        "• /informe — informe completo con picks de valor\n"
        "• /stats — rendimiento histórico\n"
        "• /help — esta ayuda\n"
        "\n"
        "El informe automático llega cada día a las <b>09:00</b> "
        "(Europe/Madrid).\n"
        "\n"
        "<i>Audiobet detecta valor, no predice el futuro.</i>"
    )


def help_message() -> str:
    return (
        "🆘 <b>Ayuda — Audiobet</b>\n"
        "\n"
        "<b>Comandos disponibles:</b>\n"
        "• /start — bienvenida\n"
        "• /hoy — partidos de hoy con predicciones del modelo\n"
        "• /manana — partidos de mañana\n"
        "• /partidos N — partidos dentro de N días (ej. /partidos 3)\n"
        "• /tenis — predicciones de tenis (torneos ATP/WTA activos)\n"
        "• /informe [N] — informe del día (N=0 hoy, 1 mañana, -1 ayer)\n"
        "• /stats — ROI, hit rate, drawdown, mejores ligas/mercados\n"
        "• /help — este mensaje\n"
        "\n"
        "<b>Cómo leer las predicciones:</b>\n"
        "• <code>1: 60% · X: 22% · 2: 18%</code> — probabilidad local/empate/visitante\n"
        "• <code>O2.5: 58%</code> — probabilidad de más de 2.5 goles\n"
        "• <code>BTTS: 51%</code> — probabilidad de que ambos marquen\n"
        "\n"
        "<b>Cómo leer una value bet:</b>\n"
        "• <i>Edge</i> = nuestra probabilidad − probabilidad implícita en la cuota\n"
        "• <i>Stake</i> = porcentaje de banca recomendado (Kelly fraccional al 25%)\n"
        "• Solo se publican picks con edge ≥ 5%\n"
        "\n"
        "⚠️ <i>Detectamos valor, no predecimos el futuro. Apuesta con responsabilidad.</i>"
    )


def stats_placeholder() -> str:
    return (
        "📊 <b>Estadísticas históricas</b>\n"
        "\n"
        "Aún no hay picks resueltas para mostrar.\n"
        "Cuando el bot lleve unos días publicando, aquí verás:\n"
        "\n"
        "• ROI total y por mes\n"
        "• Hit rate (% de picks ganadas)\n"
        "• Drawdown máximo\n"
        "• Mejores y peores ligas\n"
        "• Mejores y peores mercados"
    )


def daily_report_placeholder(report_date: str) -> str:
    return (
        f"🎯 <b>Audiobet — {_esc(report_date)}</b>\n\n"
        "<i>Pendiente de configurar fuentes de datos.</i>"
    )


# ---------------------------------------------------------------------------
# Fixtures + predictions
# ---------------------------------------------------------------------------


def _league_block(league: str, items: List[dict]) -> List[str]:
    lines = [f"📍 <b>{_esc(league)}</b>", ""]
    for it in sorted(items, key=lambda i: i["fixture"].get("date") or ""):
        fx = it["fixture"]
        pred = it.get("prediction")
        kickoff = _kickoff(fx.get("date") or "")
        home = _esc(fx.get("home_team_name") or "?")
        away = _esc(fx.get("away_team_name") or "?")

        score_h, score_a = fx.get("score_home"), fx.get("score_away")
        if score_h is not None and score_a is not None:
            lines.append(f"🕘 <b>{kickoff}</b> · {home} {score_h}-{score_a} {away}")
            lines.append("")
            continue

        lines.append(f"🕘 <b>{kickoff}</b> · {home} vs {away}")
        if pred is None:
            lines.append("   <i>datos insuficientes</i>")
        else:
            p = pred.probabilities
            lines.append(
                f"   1: <b>{_pct(p['home_win'])}</b> · "
                f"X: <b>{_pct(p['draw'])}</b> · "
                f"2: <b>{_pct(p['away_win'])}</b>"
            )
            lines.append(
                f"   O2.5: <b>{_pct(p['over_2_5'])}</b> · "
                f"BTTS: <b>{_pct(p['btts_yes'])}</b>"
            )
        lines.append("")
    return lines


def fixtures_today(fixtures: Iterable[dict]) -> str:
    """Plain fixtures list (no model). Used as fallback when no predictions."""
    fixtures = list(fixtures)
    today = datetime.now().strftime("%d/%m/%Y")
    if not fixtures:
        return (
            f"📅 <b>Partidos del {today}</b>\n\n"
            "No hay partidos en las ligas seguidas.\n"
            "<i>Cubrimos top 5 europeas y Champions League.</i>"
        )
    grouped: dict[str, list[dict]] = {}
    for fx in fixtures:
        league = fx.get("league_name") or "Otros"
        grouped.setdefault(league, []).append(fx)

    out = [f"📅 <b>Partidos del {today}</b>", ""]
    for league in sorted(grouped):
        out.append(f"📍 <b>{_esc(league)}</b>")
        out.append("")
        for fx in sorted(grouped[league], key=lambda f: f.get("date") or ""):
            kickoff = _kickoff(fx.get("date") or "")
            home = _esc(fx.get("home_team_name") or "?")
            away = _esc(fx.get("away_team_name") or "?")
            sh, sa = fx.get("score_home"), fx.get("score_away")
            if sh is not None and sa is not None:
                out.append(f"🕘 <b>{kickoff}</b> · {home} {sh}-{sa} {away}")
            else:
                out.append(f"🕘 <b>{kickoff}</b> · {home} vs {away}")
        out.append("")
    return "\n".join(out).strip()


def fixtures_today_with_predictions(
    items: Iterable[dict],
    title_date: Optional[str] = None,
) -> str:
    items = list(items)
    label = title_date or datetime.now().strftime("%d/%m/%Y")
    header = f"📅 <b>Partidos del {_esc(label)}</b>"

    if not items:
        return (
            f"{header}\n\n"
            "No hay partidos en las ligas seguidas ese día.\n"
            "<i>Cubrimos top 5 europeas y Champions League.</i>"
        )

    grouped: dict[str, list[dict]] = {}
    for it in items:
        league = it["fixture"].get("league_name") or "Otros"
        grouped.setdefault(league, []).append(it)

    lines = [header, ""]
    for league in sorted(grouped):
        lines.extend(_league_block(league, grouped[league]))

    lines.append(DIVIDER)
    lines.append("ℹ️ <i>Sin cuotas en esta vista. Para picks de valor usa</i> /informe.")
    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# Daily report (with value bets)
# ---------------------------------------------------------------------------


_OUTCOME_LABELS = {
    ("1X2", "home_win"): "Local (1)",
    ("1X2", "draw"): "Empate (X)",
    ("1X2", "away_win"): "Visitante (2)",
    ("OVER_UNDER_2_5", "over_2_5"): "Más de 2.5 goles",
    ("OVER_UNDER_2_5", "under_2_5"): "Menos de 2.5 goles",
    ("BTTS", "btts_yes"): "Ambos marcan: Sí",
    ("BTTS", "btts_no"): "Ambos marcan: No",
    ("H2H", "player1_win"): "Gana jugador 1",
    ("H2H", "player2_win"): "Gana jugador 2",
}


def _outcome_label(market: str, outcome: str) -> str:
    return _OUTCOME_LABELS.get((market, outcome), outcome)


def _confidence_emoji(label: str) -> str:
    return {"alta": "🟢", "media": "🟡", "baja": "🟠"}.get(label, "⚪")


def _pattern_pick_block(idx: int, p: dict) -> List[str]:
    """Compact tipster-style block for a pattern pick. Same vibe as the
    example tweet: title, hook, dash bullets, pick + odds + stake, CTA.
    """
    confidence = p.get("confidence", "baja")
    emoji = _confidence_emoji(confidence)
    pick_label = _outcome_label(p.get("market", ""), p.get("outcome", ""))
    book = p.get("bookmaker") or "?"
    odds = p.get("market_odds") or 0
    stake = p.get("recommended_stake_pct") or 0
    pattern_name = p.get("pattern_name") or "Patrón"
    bullets = (p.get("narrative") or {}).get("bullets") or p.get("bullets") or []
    opening = (p.get("narrative") or {}).get("opening")
    strength = p.get("pattern_strength", 0) * 100

    lines: List[str] = [
        f"{emoji} <b>#{idx} · {_esc(pattern_name)}</b>  ·  Fuerza <b>{strength:.0f}%</b>",
        "",
        f"⚽ <b>{_esc(p.get('match_label', '?'))}</b>",
    ]
    if opening:
        lines.append("")
        lines.append(f"<i>{opening}</i>")
    if bullets:
        lines.append("")
        for b in bullets:
            lines.append(f"— {b}")
    lines.append("")
    lines.append(
        f"📌 <b>{_esc(pick_label)}</b> @ <b>{odds:.2f}</b>  ·  🏛️ {_esc(book)}"
    )
    lines.append(
        f"💵 Stake: <b>{stake*100:.2f}%</b> de tu banca  ·  Confianza <b>{_esc(confidence)}</b>"
    )
    lines.append("")
    lines.append("<i>¿Te juegas algo o lo dejas pasar? 🤔</i>")
    lines.append("")
    return lines


def _pick_block(idx: int, p: dict) -> List[str]:
    """Tipster-style pick rendering. Layout:

        🟢 PICK #N
        ⚽ Match name

        Opening hook line.

        — bullet 1
        — bullet 2
        — bullet 3

        📌 Pick @ odds (book) · Stake X%
        📊 Modelo / Mercado / Edge

        ¿Te juegas algo o lo dejas pasar? 🤔
    """
    confidence = p.get("confidence", "baja")
    emoji = _confidence_emoji(confidence)
    edge = p.get("edge", 0) * 100
    ev = p.get("expected_value", 0) * 100
    pick_label = _outcome_label(p.get("market", ""), p.get("outcome", ""))
    book = p.get("bookmaker") or "?"
    narrative = p.get("narrative") or {}

    lines: List[str] = [
        f"{emoji} <b>PICK #{idx}</b>  ·  Confianza <b>{_esc(confidence)}</b>",
        "",
        f"⚽ <b>{_esc(p.get('match_label', '?'))}</b>",
    ]

    opening = narrative.get("opening")
    if opening:
        lines.append("")
        lines.append(f"<i>{opening}</i>")

    bullets = narrative.get("bullets") or []
    if bullets:
        lines.append("")
        for b in bullets:
            lines.append(f"— {b}")

    lines.append("")
    lines.append(
        f"📌 <b>{_esc(pick_label)}</b> @ <b>{p.get('market_odds', 0):.2f}</b>  "
        f"·  🏛️ {_esc(book)}"
    )
    lines.append(
        f"📊 Modelo <b>{p.get('model_probability', 0)*100:.0f}%</b>  vs  "
        f"Mercado <b>{p.get('implied_probability', 0)*100:.0f}%</b>  "
        f"·  Edge <b>+{edge:.1f}%</b>  ·  EV <b>+{ev:.1f}%</b>"
    )
    lines.append(
        f"💵 Stake: <b>{p.get('recommended_stake_pct', 0)*100:.2f}%</b> de tu banca"
    )
    lines.append("")
    lines.append("<i>¿Te juegas algo o lo dejas pasar? 🤔</i>")
    lines.append("")
    return lines


def daily_report(
    report_date: str,
    items: List[dict],
    picks: List[dict],
    is_fallback_pick: bool = False,
    pattern_picks: Optional[List[dict]] = None,
) -> str:
    """`picks` is a list of ValueBet.as_display() dicts.
    `is_fallback_pick`: True when picks contains a single 'pick of the day'
    that did not clear the regular edge threshold but has positive EV.
    """
    lines = [
        f"🎯 <b>Audiobet — {_esc(report_date)}</b>",
        "",
    ]

    # PATTERN PICKS — top of the message because they're the highest
    # confidence "tipster" reads.
    if pattern_picks:
        lines.append(DIVIDER)
        lines.append(f"🔥 <b>PATRONES DETECTADOS — {len(pattern_picks)}</b>")
        lines.append(DIVIDER)
        lines.append("")
        for idx, pp in enumerate(pattern_picks, start=1):
            lines.extend(_pattern_pick_block(idx, pp))

    lines.append(DIVIDER)
    if picks and not is_fallback_pick:
        lines.append(f"💰 <b>VALUE BETS — {len(picks)}</b>")
        lines.append(DIVIDER)
        lines.append("")
        ordered = sorted(picks, key=lambda p: p.get("edge", 0), reverse=True)
        for idx, p in enumerate(ordered, start=1):
            lines.extend(_pick_block(idx, p))
    elif is_fallback_pick and picks:
        lines.append("⭐ <b>PICK DEL DÍA</b>  ·  <i>confianza baja</i>")
        lines.append(DIVIDER)
        lines.append("")
        lines.append(
            "<i>Ningún partido cumple el umbral estándar (edge ≥ 3%), "
            "pero este es el de mayor edge con EV positivo:</i>"
        )
        lines.append("")
        lines.extend(_pick_block(1, picks[0]))
    else:
        lines.append("💤 <b>SIN VALOR HOY — MEJOR PASAR</b>")
        lines.append(DIVIDER)
        lines.append("")
        lines.append(
            "<i>Ninguna apuesta tiene EV positivo según el modelo. "
            "Apostar hoy sería tirar dinero. Mañana habrá nuevas "
            "oportunidades.</i>"
        )
        lines.append("")

    # Fixtures section
    if items:
        lines.append(DIVIDER)
        lines.append(f"📅 <b>PARTIDOS DEL DÍA — {len(items)}</b>")
        lines.append(DIVIDER)
        lines.append("")
        grouped: dict[str, list[dict]] = {}
        for it in items:
            league = it["fixture"].get("league_name") or "Otros"
            grouped.setdefault(league, []).append(it)
        for league in sorted(grouped):
            lines.extend(_league_block(league, grouped[league]))

    lines.append(DIVIDER)
    lines.append(
        "⚠️ <i>Audiobet detecta valor, no predice el futuro. "
        "Apuesta con responsabilidad.</i>"
    )
    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# Stats (Phase 5)
# ---------------------------------------------------------------------------


def stats_summary(summary: dict) -> str:
    """`summary` comes from src.analyzer.stats.compute_stats(). If empty
    (no resolved picks) we return the placeholder."""
    if not summary or summary.get("total_resolved", 0) == 0:
        return stats_placeholder()

    total = summary["total_resolved"]
    won = summary.get("won", 0)
    lost = summary.get("lost", 0)
    void = summary.get("void", 0)
    hit_rate = summary.get("hit_rate", 0.0)
    roi = summary.get("roi", 0.0)
    pnl = summary.get("pnl_units", 0.0)
    max_dd = summary.get("max_drawdown_units", 0.0)

    pnl_emoji = "📈" if pnl >= 0 else "📉"
    roi_emoji = "📈" if roi >= 0 else "📉"

    lines = [
        "📊 <b>Audiobet — Estadísticas</b>",
        "",
        DIVIDER,
        f"💼 <b>{total}</b> picks resueltas  ·  "
        f"✅ {won}  ·  ❌ {lost}  ·  ⏸️ {void}",
        DIVIDER,
        "",
        f"🎯 <b>Hit rate:</b> {hit_rate*100:.1f}%",
        f"{pnl_emoji} <b>P&L:</b> {pnl:+.2f} unidades  (1 unidad = 1% banca)",
        f"{roi_emoji} <b>ROI:</b> {roi*100:+.2f}%",
        f"📉 <b>Drawdown máx:</b> {max_dd:.2f} unidades",
        "",
    ]

    by_league = summary.get("by_league") or []
    if by_league:
        lines.append(DIVIDER)
        lines.append("🏆 <b>Por liga</b>")
        lines.append(DIVIDER)
        lines.append("")
        for row in by_league[:6]:
            sign = "+" if row["pnl"] >= 0 else ""
            lines.append(
                f"• <b>{_esc(row['league'])}</b>: "
                f"{row['won']}/{row['total']} "
                f"({row['hit_rate']*100:.0f}%) · "
                f"{sign}{row['pnl']:.2f} u"
            )
        lines.append("")

    by_market = summary.get("by_market") or []
    if by_market:
        lines.append(DIVIDER)
        lines.append("🎲 <b>Por mercado</b>")
        lines.append(DIVIDER)
        lines.append("")
        for row in by_market:
            sign = "+" if row["pnl"] >= 0 else ""
            lines.append(
                f"• <b>{_esc(row['market'])}</b>: "
                f"{row['won']}/{row['total']} "
                f"({row['hit_rate']*100:.0f}%) · "
                f"{sign}{row['pnl']:.2f} u"
            )

    return "\n".join(lines).strip()
