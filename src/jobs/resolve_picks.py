"""Resolve unresolved picks against finished fixtures.

Reads `predictions` rows where resolved=false, finds the matching fixture,
checks if the fixture finished, and updates `result` (won/lost/void) plus
`pnl_units` (profit/loss in units, where 1 unit = 1% of bankroll).

P&L convention: stake is recommended_stake_pct * 100 = stake_units.
  - Won  -> +stake_units * (market_odds - 1)
  - Lost -> -stake_units
  - Void ->  0
"""
from __future__ import annotations

import logging
from typing import Optional, Tuple

from src.storage.supabase_client import get_client

logger = logging.getLogger(__name__)


def _outcome_won(market: str, outcome: str, score_home: int, score_away: int) -> Optional[bool]:
    """Return True if the bet wins, False if it loses, None if undecidable."""
    if market == "1X2":
        if outcome == "home_win":
            return score_home > score_away
        if outcome == "draw":
            return score_home == score_away
        if outcome == "away_win":
            return score_home < score_away
        return None
    if market == "OVER_UNDER_2_5":
        total = score_home + score_away
        if outcome == "over_2_5":
            return total > 2  # strict over 2.5 = total >= 3
        if outcome == "under_2_5":
            return total <= 2
        return None
    if market == "BTTS":
        both_scored = score_home > 0 and score_away > 0
        if outcome == "btts_yes":
            return both_scored
        if outcome == "btts_no":
            return not both_scored
        return None
    return None


def _pnl_units(won: Optional[bool], stake_pct: float, decimal_odds: float) -> Tuple[str, float]:
    stake_units = (stake_pct or 0.0) * 100.0  # 1% banca = 1 unidad
    if won is True:
        return "won", stake_units * (decimal_odds - 1.0)
    if won is False:
        return "lost", -stake_units
    return "void", 0.0


def resolve_picks() -> Tuple[int, int]:
    """Walk unresolved predictions and update them. Returns (resolved, skipped)."""
    client = get_client()

    res = (
        client.table("predictions")
        .select("id,fixture_api_id,market,outcome,market_odds,recommended_stake_pct")
        .eq("resolved", False)
        .execute()
    )
    pending = res.data or []
    if not pending:
        logger.info("No unresolved picks")
        return 0, 0

    fixture_ids = sorted({p["fixture_api_id"] for p in pending if p.get("fixture_api_id") is not None})
    if not fixture_ids:
        return 0, 0

    fixtures_by_id: dict[int, dict] = {}
    chunk = 200
    for i in range(0, len(fixture_ids), chunk):
        batch = fixture_ids[i : i + chunk]
        f_res = (
            client.table("fixtures")
            .select("api_id,status,score_home,score_away")
            .in_("api_id", batch)
            .execute()
        )
        for row in f_res.data or []:
            fixtures_by_id[row["api_id"]] = row

    resolved_count = 0
    skipped = 0
    for pick in pending:
        fx = fixtures_by_id.get(pick["fixture_api_id"])
        if not fx or fx.get("status") != "finished":
            skipped += 1
            continue
        sh, sa = fx.get("score_home"), fx.get("score_away")
        if sh is None or sa is None:
            skipped += 1
            continue

        won = _outcome_won(pick.get("market"), pick.get("outcome"), int(sh), int(sa))
        result_label, pnl = _pnl_units(
            won,
            float(pick.get("recommended_stake_pct") or 0),
            float(pick.get("market_odds") or 0),
        )

        try:
            client.table("predictions").update(
                {"resolved": True, "result": result_label, "pnl_units": pnl}
            ).eq("id", pick["id"]).execute()
            resolved_count += 1
        except Exception:
            logger.exception("Failed to resolve pick id=%s", pick.get("id"))
            skipped += 1

    logger.info("Resolved %d picks, %d skipped (still pending)", resolved_count, skipped)
    return resolved_count, skipped
