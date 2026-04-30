"""Nightly data refresh.

Primary source for fixtures and results: football-data.org REST API
(requires FOOTBALL_DATA_API_KEY). FBref is kept as an optional fallback
but currently 403s from datacenter IPs, so it is skipped when the API key
is configured. Understat provides xG signals for the top 5 leagues.

Idempotent: every run upserts on api_id, so duplicate runs are safe.
"""
from __future__ import annotations

import logging
from typing import Tuple

from src.collectors.fbref import FBrefCollector, teams_from_fixtures
from src.collectors.football_data import (
    FootballDataCollector,
    teams_from_matches as fd_teams_from_matches,
)
from src.collectors.understat import (
    UnderstatCollector,
    fixture_stats_rows,
    teams_from_matches as us_teams_from_matches,
)
from src.config import Config
from src.storage.repository import (
    set_config_value,
    upsert_fixture_stats,
    upsert_fixtures,
    upsert_teams,
)
from src.utils.http import RateLimitedClient
from src.utils.rate_limiter import DomainRateLimiter

logger = logging.getLogger(__name__)


async def refresh_all(
    season_fbref: str = "2025-2026",
    season_understat: int = 2025,
    config: Config | None = None,
) -> Tuple[int, int, int]:
    """Run a full refresh. Returns (fixtures_count, fixture_stats_count, teams_count)."""
    cfg = config or Config.from_env()
    rate_limiter = DomainRateLimiter(min_interval_seconds=3.0)

    fixtures_count = 0
    stats_count = 0
    teams_count = 0
    fd_used = False

    async with RateLimitedClient(rate_limiter=rate_limiter) as client:
        if cfg.football_data_api_key:
            fd_used = True
            fd = FootballDataCollector(client=client, api_key=cfg.football_data_api_key)
            try:
                matches = await fd.fetch_all()
            except Exception:
                logger.exception("football-data refresh failed")
                matches = []

            if matches:
                teams_count += upsert_teams(fd_teams_from_matches(matches))
                fixtures_count += upsert_fixtures([m.as_row() for m in matches])
        else:
            logger.warning(
                "FOOTBALL_DATA_API_KEY not set; falling back to FBref scraping "
                "(known to 403 from datacenter IPs)."
            )
            fbref = FBrefCollector(client=client, season=season_fbref)
            try:
                fbref_fixtures = await fbref.fetch_all_fixtures()
            except Exception:
                logger.exception("FBref refresh failed")
                fbref_fixtures = []

            if fbref_fixtures:
                teams_count += upsert_teams(teams_from_fixtures(fbref_fixtures))
                fixtures_count += upsert_fixtures(
                    [f.as_row() for f in fbref_fixtures]
                )

        understat = UnderstatCollector(client=client, season=season_understat)
        try:
            understat_matches = await understat.fetch_all()
        except Exception:
            logger.exception("Understat refresh failed")
            understat_matches = []

    if understat_matches:
        teams_count += upsert_teams(us_teams_from_matches(understat_matches))
        stats_rows = fixture_stats_rows(understat_matches)
        if stats_rows:
            stats_count += upsert_fixture_stats(stats_rows)

    try:
        marker = (
            f"source={'football-data' if fd_used else 'fbref'} "
            f"fixtures={fixtures_count} stats={stats_count} teams={teams_count}"
        )
        set_config_value("last_refresh", marker)
    except Exception:
        logger.exception("Could not write last_refresh marker (non-fatal)")

    logger.info(
        "Refresh done: source=%s fixtures=%d stats=%d teams=%d",
        "football-data" if fd_used else "fbref",
        fixtures_count,
        stats_count,
        teams_count,
    )
    return fixtures_count, stats_count, teams_count
