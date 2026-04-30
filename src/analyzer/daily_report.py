"""Daily 09:00 report.

Pipeline:
1. List today's fixtures from Supabase.
2. Run the Phase-3 predictor for each.
3. If ODDS_API_KEY is set, fetch market odds and detect value bets.
4. Format a single Telegram message (HTML) and send to TELEGRAM_CHAT_ID.
5. Persist picks to the predictions table for later P&L tracking.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

import pytz
from telegram import Bot
from telegram.constants import ParseMode

from src.analyzer.predictions import predictions_for_fixtures
from src.bot import formatters
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


async def build_daily_report(config: Config, days_offset: int = 0) -> str:
    """Build the report for today (offset=0) or any future/past day.

    `days_offset` follows the same convention as /partidos: 0 = today,
    1 = tomorrow, -1 = yesterday. Picks for non-today reports are NOT
    persisted to the predictions table — we only track stakes we
    actually announce to the channel at 09:00.
    """
    from datetime import timedelta

    tz = pytz.timezone(config.timezone)
    target_local = (datetime.now(tz) + timedelta(days=days_offset)).date()
    report_date = target_local.strftime("%d/%m/%Y")

    fixtures = fixtures_on_date(target_local)
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
        # Only persist picks for the canonical 'today' report — those are the
        # ones we publish to the channel and want to track for ROI later.
        if days_offset == 0:
            _persist_picks(picks)

    message = formatters.daily_report(
        report_date=report_date,
        items=items,
        picks=[p.as_display() for p in picks],
    )

    if days_offset == 0:
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
            parse_mode=ParseMode.HTML,
            disable_web_page_preview=True,
        )
        logger.info("Daily report sent to chat_id=%s", cfg.telegram_chat_id)
    except Exception:
        logger.exception("Failed to send daily report")
        raise
