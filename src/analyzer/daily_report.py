"""Daily 09:00 report.

Builds a list of standalone Telegram messages — one per pick — so each
pick lands as its own tipster post (matching the published-tipster vibe
the user asked for). Football only; tennis stays in /tenis on demand.

Pipeline:
1. List today's fixtures from Supabase.
2. Run the Phase-3 predictor for each.
3. Fetch market odds (The Odds API), de-vig and evaluate every quote.
4. Scan empirical patterns (>=8/10 last + >=80% in H2H) — these are the
   primary picks.
5. Compute value bets (edge >= MIN_EDGE on de-vigged odds) — secondary.
6. Emit messages: header + one per pattern pick + value section + closing.
7. Persist published picks (offset=0 only) to predictions table.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional

import pytz
from telegram import Bot
from telegram.constants import ParseMode

from src.analyzer.match_context import build_match_context
from src.analyzer.narrative import build_narrative
from src.analyzer.pattern_scanner import attach_odds, scan_patterns
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
from src.utils.ids import canonical_team_id
from src.utils.rate_limiter import DomainRateLimiter

logger = logging.getLogger(__name__)


def _label(fx: dict) -> str:
    return f"{fx.get('home_team_name', '?')} vs {fx.get('away_team_name', '?')}"


def _quotes_for_match(odds_records: List[dict], fixture: dict) -> List[MarketQuote]:
    home_id = fixture.get("home_team_api_id")
    away_id = fixture.get("away_team_api_id")
    home_name = fixture.get("home_team_name") or ""
    away_name = fixture.get("away_team_name") or ""
    fixture_date = (fixture.get("date") or "")[:10]

    home_canon = canonical_team_id(home_name) if home_name else None
    away_canon = canonical_team_id(away_name) if away_name else None

    for rec in odds_records:
        if rec.get("home_team_api_id") == home_id and rec.get("away_team_api_id") == away_id:
            return rec.get("quotes") or []

    if home_canon is not None and away_canon is not None:
        for rec in odds_records:
            if rec.get("home_team_canon_id") == home_canon and rec.get("away_team_canon_id") == away_canon:
                return rec.get("quotes") or []

    if home_canon is not None and fixture_date:
        for rec in odds_records:
            if (
                rec.get("kickoff_date") == fixture_date
                and rec.get("home_team_canon_id") == home_canon
            ):
                return rec.get("quotes") or []

    return []


def _persist_value_picks(picks: List[ValueBet]) -> None:
    if not picks:
        return
    try:
        from src.storage.supabase_client import get_client
        client = get_client()
        client.table("predictions").insert([p.as_row() for p in picks]).execute()
        logger.info("Persisted %d value picks", len(picks))
    except Exception:
        logger.exception("Failed to persist value picks (non-fatal)")


def _persist_pattern_picks(picks: List[dict]) -> None:
    if not picks:
        return
    try:
        from src.storage.supabase_client import get_client
        client = get_client()
        rows = []
        for p in picks:
            rows.append(
                {
                    "fixture_api_id": p["fixture_api_id"],
                    "match_label": p["match_label"],
                    "market": p["market"],
                    "outcome": p["outcome"],
                    "model_probability": p["model_probability"],
                    "market_odds": p["market_odds"],
                    "implied_probability": p["implied_probability"],
                    "edge": p["edge"],
                    "expected_value": p["expected_value"],
                    "recommended_stake_pct": p["recommended_stake_pct"],
                    "confidence": p["confidence"],
                    "reasoning": (
                        f"Patrón {p.get('pattern_name')} - "
                        f"strength {p.get('pattern_strength', 0)*100:.0f}% "
                        f"@ {p['market_odds']:.2f} ({p.get('bookmaker', '?')})"
                    ),
                }
            )
        client.table("predictions").insert(rows).execute()
        logger.info("Persisted %d pattern picks", len(rows))
    except Exception:
        logger.exception("Failed to persist pattern picks (non-fatal)")


def _select_picks(all_candidates: List[ValueBet]) -> tuple[List[ValueBet], Optional[ValueBet]]:
    value_picks = best_value_bet_per_market([c for c in all_candidates if c.edge >= MIN_EDGE])
    if value_picks:
        return value_picks, None
    if not all_candidates:
        return [], None
    best = max(all_candidates, key=lambda c: c.edge)
    if best.expected_value > 0 and best.edge > 0:
        return [], best
    return [], None


async def build_daily_report_messages(config: Config, days_offset: int = 0) -> List[str]:
    """Return a list of standalone messages, in the order they should be
    sent. Each message is HTML-ready Telegram text.
    """
    tz = pytz.timezone(config.timezone)
    target_local = (datetime.now(tz) + timedelta(days=days_offset)).date()
    report_date = target_local.strftime("%d/%m/%Y")

    fixtures = fixtures_on_date(target_local)
    items = predictions_for_fixtures(fixtures)

    candidates: List[ValueBet] = []
    odds_records: List[dict] = []
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
        matched_fixtures = 0
        for it in items:
            fx = it["fixture"]
            pred = it.get("prediction")
            if pred is None:
                continue
            quotes = _quotes_for_match(odds_records, fx)
            if not quotes:
                continue
            matched_fixtures += 1
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
            "Daily report scan: fixtures=%d odds_records=%d matched=%d quotes=%d candidates=%d",
            len(items), len(odds_records), matched_fixtures, total_quotes, len(candidates),
        )

    # ---------- Pattern scan ----------
    pattern_picks: List[dict] = []
    if items and odds_records:
        try:
            best_per_key: dict[tuple[int, str, str], object] = {}
            for it in items:
                fx = it["fixture"]
                ctx = build_match_context(fx, n=10, h2h_n=5)
                detected = scan_patterns(ctx)
                if not detected:
                    continue
                quotes = _quotes_for_match(odds_records, fx)
                for pat in detected:
                    enriched = attach_odds(pat, quotes)
                    if enriched is None:
                        continue
                    k = (enriched.fixture_api_id, enriched.market, enriched.outcome)
                    prev = best_per_key.get(k)
                    if prev is None or enriched.pattern_strength > prev.pattern_strength:
                        best_per_key[k] = enriched

            ordered = sorted(
                best_per_key.values(),
                key=lambda p: p.pattern_strength,
                reverse=True,
            )
            pattern_picks = [pp.as_display() for pp in ordered[:5]]
            logger.info("Pattern scan: detected=%d unique=%d", len(best_per_key), len(pattern_picks))
        except Exception:
            logger.exception("Pattern scan failed (continuing)")

    # ---------- Value bets ----------
    value_picks, fallback = _select_picks(candidates)
    display_value: List[ValueBet] = list(value_picks)
    if not display_value and fallback is not None:
        display_value = [fallback]

    # Build narratives for value picks
    value_pick_dicts: list[dict] = []
    for p in display_value:
        d = p.as_display()
        try:
            fx = next(
                (it["fixture"] for it in items if it["fixture"].get("api_id") == p.fixture_api_id),
                None,
            )
            if fx is None:
                d["narrative"] = None
            else:
                ctx = build_match_context(fx, n=10, h2h_n=5)
                d["narrative"] = build_narrative(ctx, p.market, p.outcome)
        except Exception:
            logger.exception("Narrative build failed for fixture %s", p.fixture_api_id)
            d["narrative"] = None
        value_pick_dicts.append(d)

    # ---------- Persist (offset=0 only) ----------
    if days_offset == 0:
        _persist_pattern_picks(pattern_picks)
        _persist_value_picks(display_value)
        try:
            set_config_value(
                "last_report",
                f"date={report_date} fixtures={len(items)} "
                f"patterns={len(pattern_picks)} value={len(display_value)}",
            )
        except Exception:
            logger.exception("Could not persist last_report marker (non-fatal)")

    # ---------- Build the message list ----------
    messages: List[str] = []

    # 1. Header — even when nothing to publish, we send the date so the
    #    channel still has a daily heartbeat.
    messages.append(formatters.report_header(report_date, len(pattern_picks), len(display_value)))

    # 2. One message per pattern pick.
    for idx, pp in enumerate(pattern_picks, start=1):
        messages.append(formatters.pattern_pick_message(idx, pp))

    # 3. Value bets section (only when there are no patterns; otherwise the
    #    patterns are already the headline).
    if not pattern_picks and value_pick_dicts:
        messages.append(
            formatters.value_picks_message(
                value_pick_dicts,
                is_fallback=(not value_picks and fallback is not None),
            )
        )

    # 4. Closing message — context + reminder. Always send.
    messages.append(formatters.report_footer(items, has_picks=bool(pattern_picks or display_value)))

    return messages


async def build_daily_report(config: Config, days_offset: int = 0) -> str:
    """Single-string variant kept for compatibility (used by tests).
    Concatenates every message with a divider between them.
    """
    msgs = await build_daily_report_messages(config, days_offset=days_offset)
    return "\n\n".join(msgs)


async def send_daily_report(config: Optional[Config] = None) -> None:
    cfg = config or Config.from_env()
    messages = await build_daily_report_messages(cfg)
    bot = Bot(token=cfg.telegram_bot_token)
    sent = 0
    for msg in messages:
        try:
            await bot.send_message(
                chat_id=cfg.telegram_chat_id,
                text=msg,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=True,
            )
            sent += 1
            # Telegram caps to ~1 msg/sec per chat; pad a bit.
            await asyncio.sleep(1.5)
        except Exception:
            logger.exception("Failed to send a daily report chunk")
    logger.info("Daily report: sent %d/%d messages to chat_id=%s", sent, len(messages), cfg.telegram_chat_id)
