"""Daily 09:00 report.

Pipeline:
1. List today's fixtures from Supabase.
2. For each, compute model probabilities via the Phase-3 predictor.
3. If ODDS_API_KEY is configured, fetch market odds for those fixtures.
4. Compare model vs market and pick value bets (edge >= 5%).
5. Format a single Telegram message and send to TELEGRAM_CHAT_ID.
6. Persist picks to the predictions table for later P&L tracking.

Steps 3-5 degrade gracefully: if odds are missing the report still goes
out with predictions and a note explaining no picks were generated.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

import pytz
from telegram import Bot
from telegram.constants import ParseMode

from src.analyzer.predictions import predictions_for_fixtures
from src.collectors.odds_api import OddsApiCollector
from src.config import Config
from src.models.value_detector import (
    MarketQuote,
    ValueBet,
    best_value_bet_per_market,
    detect_value_bets,
)
from src.storage.repository import (
    fixtures_on_date,
    set_config_value,
)
from src.utils.http import RateLimitedClient
from src.utils.rate_limiter import DomainRateLimiter

logger = logging.getLogger(__name__)


def _label(fx: dict) -> str:
    return f"{fx.get('home_team_name', '?')} vs {fx.get('away_team_name', '?')}"


def _kickoff(fx: dict) -> str:
    raw = fx.get("date") or ""
    try:
        return datetime.fromisoformat(raw).strftime("%H:%M")
    except (ValueError, TypeError):
        return "--:--"


def _quotes_for_match(odds_records: List[dict], home_id: int, away_id: int) -> List[MarketQuote]:
    for rec in odds_records:
        if rec.get("home_team_api_id") == home_id and rec.get("away_team_api_id") == away_id:
            return rec.get("quotes") or []
    return []


def _persist_picks(picks: List[ValueBet]) -> None:
    if not picks:
        return
    try:
        from src.storage.supabase_client import get_client
        client = get_client()
        client.table("predictions").insert([p.as_row() for p in picks]).execute()
        logger.info("Persisted %d picks to predictions table", len(picks))
    except Exception:
        logger.exception("Failed to persist picks (non-fatal)")


def _format_message(
    report_date: str,
    items: List[dict],
    picks: List[ValueBet],
) -> str:
    lines = [f"*Audiobet — {report_date}*", ""]

    if picks:
        lines.append(f"*Picks de valor — {len(picks)}*")
        for p in sorted(picks, key=lambda b: b.edge, reverse=True):
            lines.append(
                f"  • *{p.match_label}*\n"
                f"    {_outcome_label(p.market, p.outcome)} "
                f"@ {p.decimal_odds:.2f} ({p.bookmaker})\n"
                f"    Modelo {p.model_probability*100:.1f}% · "
                f"Mercado {p.implied_probability*100:.1f}% · "
                f"Edge +{p.edge*100:.1f} pts\n"
                f"    Stake recomendado: {p.recommended_stake_pct*100:.2f}% banca · "
                f"Confianza {p.confidence}"
            )
        lines.append("")
    else:
        lines.append("_Sin picks de valor hoy._")
        lines.append("")

    if items:
        lines.append("*Partidos analizados*")
        for it in items:
            fx = it["fixture"]
            pred = it.get("prediction")
            kickoff = _kickoff(fx)
            label = _label(fx)
            if pred:
                p = pred.probabilities
                lines.append(
                    f"  {kickoff} · {label}: "
                    f"{p['home_win']*100:.0f}/{p['draw']*100:.0f}/{p['away_win']*100:.0f}  "
                    f"O2.5 {p['over_2_5']*100:.0f}%"
                )
            else:
                lines.append(f"  {kickoff} · {label}: _datos insuficientes_")
        lines.append("")

    lines.append("_Audiobet detecta valor, no predice el futuro. "
                 "Apuesta con responsabilidad._")
    return "\n".join(lines).strip()


def _outcome_label(market: str, outcome: str) -> str:
    if market == "1X2":
        return {"home_win": "Local (1)", "draw": "Empate (X)", "away_win": "Visitante (2)"}.get(outcome, outcome)
    if market == "OVER_UNDER_2_5":
        return "Más de 2.5 goles" if outcome == "over_2_5" else "Menos de 2.5 goles"
    if market == "BTTS":
        return "Ambos marcan: Sí" if outcome == "btts_yes" else "Ambos marcan: No"
    return outcome


async def build_daily_report(config: Config) -> str:
    tz = pytz.timezone(config.timezone)
    today_local = datetime.now(tz).date()
    report_date = today_local.strftime("%d/%m/%Y")

    fixtures = fixtures_on_date(today_local)
    items = predictions_for_fixtures(fixtures)

    picks: List[ValueBet] = []
    if config.odds_api_key and items:
        rate_limiter = DomainRateLimiter(min_interval_seconds=3.0)
        async with RateLimitedClient(rate_limiter=rate_limiter) as client:
            odds = OddsApiCollector(client=client, api_key=config.odds_api_key)
            try:
                odds_records = await odds.fetch_all()
            except Exception:
                logger.exception("Odds fetch failed; proceeding without picks")
                odds_records = []

        for it in items:
            fx = it["fixture"]
            pred = it.get("prediction")
            if pred is None:
                continue
            quotes = _quotes_for_match(
                odds_records,
                fx.get("home_team_api_id"),
                fx.get("away_team_api_id"),
            )
            if not quotes:
                continue
            bets = detect_value_bets(
                fixture_api_id=fx.get("api_id"),
                match_label=_label(fx),
                model_probabilities=pred.probabilities,
                quotes=quotes,
            )
            picks.extend(bets)

        picks = best_value_bet_per_market(picks)
        _persist_picks(picks)

    message = _format_message(report_date, items, picks)

    try:
        set_config_value(
            "last_report",
            f"date={report_date} fixtures={len(items)} picks={len(picks)}",
        )
    except Exception:
        logger.exception("Could not persist last_report marker (non-fatal)")

    return message


async def send_daily_report(config: Optional[Config] = None) -> None:
    cfg = config or Config.from_env()
    text = await build_daily_report(cfg)
    bot = Bot(token=cfg.telegram_bot_token)
    try:
        await bot.send_message(
            chat_id=cfg.telegram_chat_id,
            text=text,
            parse_mode=ParseMode.MARKDOWN,
            disable_web_page_preview=True,
        )
        logger.info("Daily report sent to chat_id=%s", cfg.telegram_chat_id)
    except Exception:
        logger.exception("Failed to send daily report")
        raise
