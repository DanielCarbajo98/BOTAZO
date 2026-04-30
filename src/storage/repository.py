"""Supabase repository helpers — idempotent upserts for the existing schema."""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Iterable, List, Optional

from src.storage.supabase_client import get_client

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_teams(teams: Iterable[dict]) -> int:
    """Upsert team rows keyed by api_id. Each dict must include api_id and name."""
    rows = list(teams)
    if not rows:
        return 0
    for row in rows:
        row.setdefault("last_updated", _now_iso())
    client = get_client()
    client.table("teams").upsert(rows, on_conflict="api_id").execute()
    logger.info("Upserted %d teams", len(rows))
    return len(rows)


def upsert_fixtures(fixtures: Iterable[dict]) -> int:
    """Upsert fixture rows keyed by api_id."""
    rows = list(fixtures)
    if not rows:
        return 0
    for row in rows:
        row.setdefault("last_updated", _now_iso())
    client = get_client()
    client.table("fixtures").upsert(rows, on_conflict="api_id").execute()
    logger.info("Upserted %d fixtures", len(rows))
    return len(rows)


def upsert_fixture_stats(stats: Iterable[dict]) -> int:
    rows = list(stats)
    if not rows:
        return 0
    for row in rows:
        row.setdefault("fetched_at", _now_iso())
    client = get_client()
    client.table("fixture_stats").upsert(rows, on_conflict="fixture_api_id").execute()
    logger.info("Upserted %d fixture_stats", len(rows))
    return len(rows)


def fixtures_on_date(target: date) -> List[dict]:
    """Return fixtures scheduled on a given local date, ordered by kickoff."""
    client = get_client()
    start = datetime.combine(target, datetime.min.time()).isoformat()
    end = datetime.combine(target, datetime.max.time()).isoformat()
    res = (
        client.table("fixtures")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", desc=False)
        .execute()
    )
    return res.data or []


def fixtures_recent_by_team(team_api_id: int, limit: int = 15) -> List[dict]:
    client = get_client()
    res = (
        client.table("fixtures")
        .select("*")
        .or_(f"home_team_api_id.eq.{team_api_id},away_team_api_id.eq.{team_api_id}")
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def get_config_value(key: str) -> Optional[str]:
    client = get_client()
    res = client.table("bot_config").select("value").eq("key", key).limit(1).execute()
    if res.data:
        return res.data[0].get("value")
    return None


def set_config_value(key: str, value: str) -> None:
    client = get_client()
    client.table("bot_config").upsert(
        {"key": key, "value": value, "updated_at": _now_iso()},
        on_conflict="key",
    ).execute()
