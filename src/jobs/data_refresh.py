"""Nightly data refresh: pulls fixtures from FBref and xG from Understat,
upserts everything into Supabase. Designed to be idempotent so it can run
manually or on a cron without duplicating rows.
"""
from __future__ import annotations

import logging
from typing import Tuple

from src.collectors.fbref import FBrefCollector, teams_from_fixtures
from src.collectors.understat import UnderstatCollector, fixture_stats_rows, teams_from_matches
from src.storage.repository import (
    set_config_value,
    upsert_fixture_stats,
    upsert_fixtures,
    upsert_teams,
)
from src.utils.http import RateLimitedClient
from src.utils.rate_limiter import DomainRateLimiter

logger = logging.getLogger(__name__)


async def refresh_all(season_fbref: str = "2025-2026", season_understat: int = 2025) -> Tuple[int, int, int]:
    """Run a full refresh. Returns (fixtures_count, fixture_stats_count, teams_count)."""
    rate_limiter = DomainRateLimiter(min_interval_seconds=3.0)

    fixtures_count = 0
    stats_count = 0
    teams_count = 0

    async with RateLimitedClient(rate_limiter=rate_limiter) as client:
        fbref = FBrefCollector(client=client, season=season_fbref)
        understat = UnderstatCollector(client=client, season=season_understat)

        try:
            fbref_fixtures = await fbref.fetch_all_fixtures()
        except Exception:
            logger.exception("FBref refresh failed; continuing with Understat only")
            fbref_fixtures = []

        try:
            understat_matches = await understat.fetch_all()
        except Exception:
            logger.exception("Understat refresh failed")
            understat_matches = []

    if fbref_fixtures:
        teams = teams_from_fixtures(fbref_fixtures)
        teams_count += upsert_teams(teams)
        fixtures_count += upsert_fixtures([f.as_row() for f in fbref_fixtures])

    if understat_matches:
        teams_count += upsert_teams(teams_from_matches(understat_matches))
        stats_rows = fixture_stats_rows(understat_matches)
        if stats_rows:
            stats_count += upsert_fixture_stats(stats_rows)

    try:
        set_config_value(
            "last_refresh",
            f"fixtures={fixtures_count} stats={stats_count} teams={teams_count}",
        )
    except Exception:
        logger.exception("Could not write last_refresh marker (non-fatal)")

    logger.info(
        "Refresh done: fixtures=%d stats=%d teams=%d",
        fixtures_count,
        stats_count,
        teams_count,
    )
    return fixtures_count, stats_count, teams_count
