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

from datetime import datetime

from src.collectors.fbref import FBrefCollector, teams_from_fixtures
from src.collectors.football_data import (
    FootballDataCollector,
    teams_from_matches as fd_teams_from_matches,
)
from src.collectors.tennis_sackmann import (
    SackmannCollector,
    matches_to_rows as tennis_matches_to_rows,
    players_from_matches as tennis_players_from_matches,
)
from src.collectors.understat import (
    UnderstatCollector,
    fixture_stats_rows,
    teams_from_matches as us_teams_from_matches,
)
from src.config import Config
from src.models.tennis_elo import TennisEloRater
from src.storage.repository import (
    all_finished_tennis_matches,
    set_config_value,
    update_tennis_player_ratings,
    upsert_fixture_stats,
    upsert_fixtures,
    upsert_teams,
    upsert_tennis_matches,
    upsert_tennis_players,
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
                try:
                    teams_count += upsert_teams(fd_teams_from_matches(matches))
                except Exception:
                    logger.exception("upsert_teams failed (continuing)")
                try:
                    fixtures_count += upsert_fixtures([m.as_row() for m in matches])
                except Exception:
                    logger.exception("upsert_fixtures failed (continuing)")
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
                try:
                    teams_count += upsert_teams(teams_from_fixtures(fbref_fixtures))
                except Exception:
                    logger.exception("upsert_teams failed (continuing)")
                try:
                    fixtures_count += upsert_fixtures(
                        [f.as_row() for f in fbref_fixtures]
                    )
                except Exception:
                    logger.exception("upsert_fixtures failed (continuing)")

        understat = UnderstatCollector(client=client, season=season_understat)
        try:
            understat_matches = await understat.fetch_all()
        except Exception:
            logger.exception("Understat refresh failed")
            understat_matches = []

        # Tennis: pull current and previous calendar year from Sackmann.
        # That window is enough for stable Elo on active players.
        sackmann = SackmannCollector(client=client)
        current_year = datetime.utcnow().year
        years = [current_year - 1, current_year]
        try:
            atp_matches = await sackmann.fetch_recent("ATP", years)
        except Exception:
            logger.exception("Sackmann ATP fetch failed")
            atp_matches = []
        try:
            wta_matches = await sackmann.fetch_recent("WTA", years)
        except Exception:
            logger.exception("Sackmann WTA fetch failed")
            wta_matches = []

    if understat_matches:
        try:
            teams_count += upsert_teams(us_teams_from_matches(understat_matches))
        except Exception:
            logger.exception("upsert_teams (understat) failed (continuing)")
        stats_rows = fixture_stats_rows(understat_matches)
        if stats_rows:
            try:
                stats_count += upsert_fixture_stats(stats_rows)
            except Exception:
                logger.exception("upsert_fixture_stats failed (continuing)")

    # Tennis upserts and Elo rebuild
    tennis_players_count = 0
    tennis_matches_count = 0
    tennis_elo_count = 0
    all_tennis = list(atp_matches) + list(wta_matches)
    if all_tennis:
        try:
            tennis_players_count = upsert_tennis_players(
                tennis_players_from_matches(all_tennis)
            )
        except Exception:
            logger.exception("upsert_tennis_players failed (continuing)")
        try:
            tennis_matches_count = upsert_tennis_matches(
                tennis_matches_to_rows(all_tennis)
            )
        except Exception:
            logger.exception("upsert_tennis_matches failed (continuing)")

        # Rebuild Elo from the freshly persisted matches
        try:
            persisted = all_finished_tennis_matches()
            rater = TennisEloRater()
            plays = []
            for m in persisted:
                w = m.get("winner_api_id")
                p1 = m.get("player1_api_id")
                p2 = m.get("player2_api_id")
                if w is None or p1 is None or p2 is None:
                    continue
                loser = p2 if w == p1 else p1
                plays.append(
                    {"winner_api_id": w, "loser_api_id": loser, "surface": m.get("surface")}
                )
            rater.feed_matches(plays)
            tennis_elo_count = update_tennis_player_ratings(rater.snapshot())
        except Exception:
            logger.exception("tennis Elo rebuild failed (non-fatal)")

    try:
        marker = (
            f"source={'football-data' if fd_used else 'fbref'} "
            f"fixtures={fixtures_count} stats={stats_count} teams={teams_count} "
            f"tennis_players={tennis_players_count} tennis_matches={tennis_matches_count} "
            f"tennis_elo={tennis_elo_count}"
        )
        set_config_value("last_refresh", marker)
    except Exception:
        logger.exception("Could not write last_refresh marker (non-fatal)")

    logger.info(
        "Refresh done: source=%s fixtures=%d stats=%d teams=%d "
        "tennis_players=%d tennis_matches=%d tennis_elo=%d",
        "football-data" if fd_used else "fbref",
        fixtures_count,
        stats_count,
        teams_count,
        tennis_players_count,
        tennis_matches_count,
        tennis_elo_count,
    )
    return fixtures_count, stats_count, teams_count
