"""Telegram message formatters. Markdown V2 escaping kept simple for now."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable


def welcome_message() -> str:
    return (
        "*Audiobet*\n"
        "Bot de análisis de fútbol con detección de value bets.\n\n"
        "Comandos disponibles:\n"
        "/hoy — partidos analizados de hoy\n"
        "/stats — rendimiento histórico\n"
        "/help — ayuda\n\n"
        "El informe automático llega cada día a las 09:00 (Europe/Madrid)."
    )


def help_message() -> str:
    return (
        "*Ayuda — Audiobet*\n\n"
        "/start — mensaje de bienvenida\n"
        "/hoy — partidos del día con picks de valor (edge ≥ 5%)\n"
        "/stats — ROI, hit rate y métricas históricas\n"
        "/help — esta ayuda\n\n"
        "Audiobet detecta valor, no predice el futuro. "
        "Apuesta con responsabilidad."
    )


def today_placeholder() -> str:
    today = datetime.now().strftime("%d/%m/%Y")
    return (
        f"*Informe del {today}*\n\n"
        "_Pendiente — collectors y modelo en desarrollo (Fase 2-4)._\n\n"
        "Cuando esté listo, aquí verás los partidos analizados y las apuestas con edge."
    )


def _kickoff_label(date_iso: str) -> str:
    try:
        kickoff = datetime.fromisoformat(date_iso)
        return kickoff.strftime("%H:%M")
    except (ValueError, TypeError):
        return "--:--"


def fixtures_today(fixtures: Iterable[dict]) -> str:
    fixtures = list(fixtures)
    today = datetime.now().strftime("%d/%m/%Y")
    if not fixtures:
        return (
            f"*Partidos del {today}*\n\n"
            "No hay partidos en las ligas seguidas (top 5 europeas + Champions/Europa).\n\n"
            "_El detector de valor llega en la Fase 4._"
        )

    grouped: dict[str, list[dict]] = {}
    for fx in fixtures:
        league = fx.get("league_name") or "Otros"
        grouped.setdefault(league, []).append(fx)

    lines = [f"*Partidos del {today}*", ""]
    for league in sorted(grouped):
        lines.append(f"*{league}*")
        for fx in sorted(grouped[league], key=lambda f: f.get("date") or ""):
            kickoff = _kickoff_label(fx.get("date") or "")
            home = fx.get("home_team_name") or "?"
            away = fx.get("away_team_name") or "?"
            score_h, score_a = fx.get("score_home"), fx.get("score_away")
            if score_h is not None and score_a is not None:
                lines.append(f"  {kickoff} — {home} {score_h}-{score_a} {away}")
            else:
                lines.append(f"  {kickoff} — {home} vs {away}")
        lines.append("")

    lines.append("_Picks de valor aún no disponibles (llegan en Fase 4)._")
    return "\n".join(lines).strip()


def stats_placeholder() -> str:
    return (
        "*Estadísticas históricas*\n\n"
        "_Pendiente — el tracking se activa cuando empiecen a resolverse picks (Fase 5)._\n\n"
        "Métricas previstas: ROI, hit rate, drawdown, mejores ligas y mercados."
    )


def daily_report_placeholder(report_date: str) -> str:
    return (
        f"*Informe automático — {report_date}*\n\n"
        "_Fase 1: scheduler activo. El análisis real llegará en fases posteriores._"
    )
