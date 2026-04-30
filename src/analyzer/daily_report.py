"""Daily 09:00 report.

Pipeline:
1. List today's fixtures from Supabase.
2. Run the Phase-3 predictor for each.
3. If ODDS_API_KEY is set, fetch market odds and de-vig them.
4. Evaluate every (match, market, outcome) combination — store edges.
5. Build the report:
   - All bets with edge >= MIN_EDGE  ->  "Value picks" section.
   - If none, but the highest-edge candidate has POSITIVE EV ->
     publish it as "Pick del día (confianza baja)".
   - If even the best candidate has negative EV -> honest "no value
     today, better to pass" message.
6. Persist published picks (offset=0 only) to predictions table.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import List, Optional

import pytz
from telegram import Bot
from telegram.constants import ParseMode

from src.analyzer.predictions import predictions_for_fixtures
from src.bot import formatters
from src.collectors.odds_api import OddsApiCollector
from src.config import Config
from src.models.value_detector import (
    MIN_EDGE,
    MarketQuote,
    ValueBet,
    best_value_bet_per_market,
    devig_quotes,
    evaluate_all_quotes,
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


def _select_picks(all_candidates: List[ValueBet]) -> tuple[List[ValueBet], Optional[ValueBet]]:
    """Return (value_picks, fallback_pick).

    value_picks: every candidate with edge >= MIN_EDGE, deduped per market.
    fallback_pick: the single best candidate when there are no value picks
      AND its EV is positive — used as 'Pick del día (confianza baja)'.
    """
    value_picks = best_value_bet_per_market([c for c in all_candidates if c.edge >= MIN_EDGE])
    if value_picks:
        return value_picks, None

    if not all_candidates:
        return [], None

    best = max(all_candidates, key=lambda c: c.edge)
    if best.expected_value > 0 and best.edge > 0:
        return [], best
    return [], None


async def build_daily_report(config: Config, days_offset: int = 0) -> str:
    tz = pytz.timezone(config.timezone)
    target_local = (datetime.now(tz) + timedelta(days=days_offset)).date()
    report_date = target_local.strftime("%d/%m/%Y")

    fixtures = fixtures_on_date(target_local)
    items = predictions_for_fixtures(fixtures)

    candidates: List[ValueBet] = []
    if config.odds_api_key and items:
        rate_limiter = DomainRateLimiter(min_interval_seconds=3.0)
        async with RateLimitedClient(rate_limiter=rate_limiter) as client:
            odds = OddsApiCollector(client=client, api_key=config.odds_api_key)
            try:
                odds_records = await odds.fetch_all()
            except Exception:
                logger.exception("Odds fetch failed; proceeding without picks")
                odds_records = []

        total_quotes = 0
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
            total_quotes += len(quotes)
            fair_quotes = devig_quotes(quotes)
            bets = evaluate_all_quotes(
                fixture_api_id=fx.get("api_id"),
                match_label=_label(fx),
                model_probabilities=pred.probabilities,
                fair_quotes=fair_quotes,
            )
            candidates.extend(bets)

        logger.info(
            "Daily report scan: %d fixtures, %d quotes, %d candidates evaluated",
            len(items),
            total_quotes,
            len(candidates),
        )

    value_picks, fallback = _select_picks(candidates)

    # Picks for display: value picks first; if none, the fallback (single).
    display_picks: List[ValueBet] = list(value_picks)
    if not display_picks and fallback is not None:
        display_picks = [fallback]

    # Only persist for the canonical 'today' report and only if there is
    # something to commit to publicly (matches our tracking honesty rule).
    if days_offset == 0:
        _persist_picks(display_picks)

    message = formatters.daily_report(
        report_date=report_date,
        items=items,
        picks=[p.as_display() for p in display_picks],
        is_fallback_pick=(not value_picks and fallback is not None),
    )

    if days_offset == 0:
        try:
            set_config_value(
                "last_report",
                f"date={report_date} fixtures={len(items)} "
                f"value_picks={len(value_picks)} fallback={'yes' if fallback else 'no'}",
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
