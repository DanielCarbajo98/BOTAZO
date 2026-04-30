"""Telegram message formatters. Markdown V2 escaping kept simple for now."""
from __future__ import annotations

from datetime import datetime


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
