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

from src.analyzer.match_context import build_match_context
from src.analyzer.narrative import build_narrative
from src.analyzer.predictions import predictions_for_fixtures
from src.analyzer.tennis_predictions import get_tennis_rater, predict_match as predict_tennis_match
from src.bot import formatters
from src.collectors.odds_api import OddsApiCollector
from src.collectors.tennis_sackmann import player_api_id as tennis_player_api_id
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
from src.utils.ids import canonical_team_id, stable_int_id
from src.utils.rate_limiter import DomainRateLimiter


def stable_int_id_for_tennis(date_iso: str, p1: str, p2: str) -> int:
    """Stable id for a tennis match used as fixture_api_id in predictions
    table. Order-insensitive so p1/p2 swap doesn't desync."""
    pair = "|".join(sorted([p1.lower(), p2.lower()]))
    return stable_int_id("tennis_pick", date_iso, pair)

logger = logging.getLogger(__name__)


def _label(fx: dict) -> str:
    return f"{fx.get('home_team_name', '?')} vs {fx.get('away_team_name', '?')}"


def _quotes_for_match(
    odds_records: List[dict],
    fixture: dict,
) -> List[MarketQuote]:
    """Try to find odds for this fixture in three increasingly fuzzy ways.

    Returns the first non-empty match.
    """
    home_id = fixture.get("home_team_api_id")
    away_id = fixture.get("away_team_api_id")
    home_name = fixture.get("home_team_name") or ""
    away_name = fixture.get("away_team_name") or ""
    fixture_date = (fixture.get("date") or "")[:10]

    home_canon = canonical_team_id(home_name) if home_name else None
    away_canon = canonical_team_id(away_name) if away_name else None

    # Pass 1: exact strict-ID match (works when both sources spelled identically)
    for rec in odds_records:
        if rec.get("home_team_api_id") == home_id and rec.get("away_team_api_id") == away_id:
            return rec.get("quotes") or []

    # Pass 2: canonical-ID match (handles "Real Madrid CF" vs "Real Madrid")
    if home_canon is not None and away_canon is not None:
        for rec in odds_records:
            if rec.get("home_team_canon_id") == home_canon and rec.get("away_team_canon_id") == away_canon:
                return rec.get("quotes") or []

    # Pass 3: same date + canonical home matches anywhere
    if home_canon is not None and fixture_date:
        for rec in odds_records:
            if (
                rec.get("kickoff_date") == fixture_date
                and rec.get("home_team_canon_id") == home_canon
            ):
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
        matched_fixtures = 0
        unmatched_examples: list[str] = []
        for it in items:
            fx = it["fixture"]
            pred = it.get("prediction")
            if pred is None:
                continue
            quotes = _quotes_for_match(odds_records, fx)
            if not quotes:
                if len(unmatched_examples) < 3:
                    unmatched_examples.append(_label(fx))
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
            len(items),
            len(odds_records),
            matched_fixtures,
            total_quotes,
            len(candidates),
        )
        if unmatched_examples:
            logger.info("Unmatched fixtures (no odds found): %s", ", ".join(unmatched_examples))
        if odds_records and matched_fixtures == 0:
            sample_odds = [(rec.get("home"), rec.get("away")) for rec in odds_records[:5]]
            logger.warning(
                "Got %d odds records but ZERO matched. Sample odds names: %s",
                len(odds_records),
                sample_odds,
            )

    # ------------------------------------------------------------------
    # TENNIS — pull active tournaments from The Odds API, predict via Elo,
    # evaluate every quote against our model. Use the same de-vig +
    # value-detector machinery as football for consistent picks.
    # ------------------------------------------------------------------
    if config.odds_api_key:
        rate_limiter = DomainRateLimiter(min_interval_seconds=3.0)
        async with RateLimitedClient(rate_limiter=rate_limiter) as client:
            odds = OddsApiCollector(client=client, api_key=config.odds_api_key)
            try:
                tennis_records = await odds.fetch_tennis()
            except Exception:
                logger.exception("Tennis odds fetch failed; skipping tennis section")
                tennis_records = []

        target_iso = target_local.isoformat()
        try:
            rater = get_tennis_rater()
        except Exception:
            logger.exception("Tennis Elo unavailable; skipping tennis predictions")
            rater = None

        tennis_candidates_count = 0
        tennis_matched = 0
        if rater is not None:
            for rec in tennis_records:
                if rec.get("kickoff_date") != target_iso:
                    continue
                tennis_matched += 1
                p1 = rec.get("player1_name") or ""
                p2 = rec.get("player2_name") or ""
                # Tour is unknown from Odds API; try ATP first, fall back to WTA
                # (player_api_id() prefixes by tour, so we use the rating that's
                # populated — pick whichever has more matches played).
                p1_atp = rater.get(tennis_player_api_id("ATP", p1))
                p1_wta = rater.get(tennis_player_api_id("WTA", p1))
                tour = "ATP" if p1_atp.matches >= p1_wta.matches else "WTA"
                model = predict_tennis_match(tour, p1, p2, surface=None, rater=rater)
                model_probs = {
                    "player1_win": model["player1_win"],
                    "player2_win": model["player2_win"],
                }
                fair_quotes = devig_quotes(rec.get("quotes") or [])
                fixture_api_id_local = stable_int_id_for_tennis(target_iso, p1, p2)
                bets = evaluate_all_quotes(
                    fixture_api_id=fixture_api_id_local,
                    match_label=f"{p1} vs {p2}",
                    model_probabilities=model_probs,
                    fair_quotes=fair_quotes,
                )
                tennis_candidates_count += len(bets)
                candidates.extend(bets)

        logger.info(
            "Tennis scan: records=%d matched=%d candidates=%d",
            len(tennis_records),
            tennis_matched,
            tennis_candidates_count,
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

    # Build a tipster-style narrative for each displayed football pick.
    pick_dicts: list[dict] = []
    for p in display_picks:
        d = p.as_display()
        # Tennis picks have no fixture row in `fixtures`; skip narrative.
        if p.market == "H2H":
            d["narrative"] = None
            pick_dicts.append(d)
            continue
        try:
            fx = next(
                (it["fixture"] for it in items if it["fixture"].get("api_id") == p.fixture_api_id),
                None,
            )
            if fx is None:
                d["narrative"] = None
            else:
                ctx = build_match_context(fx)
                d["narrative"] = build_narrative(ctx, p.market, p.outcome)
        except Exception:
            logger.exception("Narrative build failed for fixture %s", p.fixture_api_id)
            d["narrative"] = None
        pick_dicts.append(d)

    message = formatters.daily_report(
        report_date=report_date,
        items=items,
        picks=pick_dicts,
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
