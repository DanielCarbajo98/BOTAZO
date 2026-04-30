"""Aggregate the predictions table into the dictionary the /stats handler
turns into a Telegram message.

All metrics are computed in 'units' (1 unit = 1% of bankroll, matching the
convention used by resolve_picks). ROI is total P&L divided by total stake
in those same units.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Dict, List, Optional

from src.storage.supabase_client import get_client

logger = logging.getLogger(__name__)

_MARKET_DISPLAY = {
    "1X2": "1X2",
    "OVER_UNDER_2_5": "Over/Under 2.5",
    "BTTS": "Ambos marcan",
}


def _stake_units(row: dict) -> float:
    return float(row.get("recommended_stake_pct") or 0) * 100.0


def _league_label(fixture_lookup: Dict[int, dict], fixture_api_id: Optional[int]) -> str:
    if fixture_api_id is None:
        return "Otros"
    fx = fixture_lookup.get(fixture_api_id)
    if not fx:
        return "Otros"
    return fx.get("league_name") or "Otros"


def _max_drawdown(running_pnl: List[float]) -> float:
    """Largest peak-to-trough drop in the cumulative-P&L series, in units."""
    peak = -float("inf")
    max_dd = 0.0
    for value in running_pnl:
        peak = max(peak, value)
        drop = peak - value
        if drop > max_dd:
            max_dd = drop
    return max_dd


def compute_stats() -> dict:
    client = get_client()
    res = (
        client.table("predictions")
        .select("*")
        .eq("resolved", True)
        .order("created_at", desc=False)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return {"total_resolved": 0}

    fixture_ids = sorted({r.get("fixture_api_id") for r in rows if r.get("fixture_api_id") is not None})
    fixture_lookup: Dict[int, dict] = {}
    chunk = 200
    for i in range(0, len(fixture_ids), chunk):
        batch = fixture_ids[i : i + chunk]
        if not batch:
            continue
        f_res = (
            client.table("fixtures")
            .select("api_id,league_name")
            .in_("api_id", batch)
            .execute()
        )
        for fx in f_res.data or []:
            fixture_lookup[fx["api_id"]] = fx

    won = lost = void = 0
    total_pnl = 0.0
    total_stake = 0.0
    running: List[float] = []

    by_league_acc: Dict[str, dict] = defaultdict(
        lambda: {"won": 0, "lost": 0, "void": 0, "total": 0, "pnl": 0.0, "stake": 0.0}
    )
    by_market_acc: Dict[str, dict] = defaultdict(
        lambda: {"won": 0, "lost": 0, "void": 0, "total": 0, "pnl": 0.0, "stake": 0.0}
    )

    for row in rows:
        result = row.get("result")
        pnl = float(row.get("pnl_units") or 0)
        stake = _stake_units(row)
        league = _league_label(fixture_lookup, row.get("fixture_api_id"))
        market = _MARKET_DISPLAY.get(row.get("market"), row.get("market") or "?")

        total_pnl += pnl
        total_stake += stake
        running.append(total_pnl)

        if result == "won":
            won += 1
            by_league_acc[league]["won"] += 1
            by_market_acc[market]["won"] += 1
        elif result == "lost":
            lost += 1
            by_league_acc[league]["lost"] += 1
            by_market_acc[market]["lost"] += 1
        else:
            void += 1
            by_league_acc[league]["void"] += 1
            by_market_acc[market]["void"] += 1

        for acc in (by_league_acc[league], by_market_acc[market]):
            acc["total"] += 1
            acc["pnl"] += pnl
            acc["stake"] += stake

    decided = won + lost  # voids excluded from hit rate
    hit_rate = (won / decided) if decided else 0.0
    roi = (total_pnl / total_stake) if total_stake > 0 else 0.0

    def _summarise(acc: Dict[str, dict], label_key: str) -> List[dict]:
        out = []
        for label, data in acc.items():
            decided_local = data["won"] + data["lost"]
            out.append(
                {
                    label_key: label,
                    "won": data["won"],
                    "lost": data["lost"],
                    "void": data["void"],
                    "total": data["total"],
                    "pnl": round(data["pnl"], 2),
                    "stake": round(data["stake"], 2),
                    "hit_rate": (data["won"] / decided_local) if decided_local else 0.0,
                    "roi": (data["pnl"] / data["stake"]) if data["stake"] > 0 else 0.0,
                }
            )
        out.sort(key=lambda r: r["pnl"], reverse=True)
        return out

    return {
        "total_resolved": len(rows),
        "won": won,
        "lost": lost,
        "void": void,
        "hit_rate": hit_rate,
        "pnl_units": round(total_pnl, 2),
        "stake_units": round(total_stake, 2),
        "roi": roi,
        "max_drawdown_units": round(_max_drawdown(running), 2),
        "by_league": _summarise(by_league_acc, "league"),
        "by_market": _summarise(by_market_acc, "market"),
    }
