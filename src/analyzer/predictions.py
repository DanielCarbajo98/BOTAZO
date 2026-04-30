"""Prediction service: pulls team form + Elo from Supabase and runs the
predictor for a given fixture.

Caches the EloRater for 1h to avoid replaying every finished fixture on
every /hoy call. The cache is process-local (the bot is one process) and
short-lived enough that nightly results show up by next morning.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

from src.models.elo import EloRater
from src.models.predictor import MatchPrediction, predict_match
from src.models.xg_adjusted import compute_team_form
from src.storage.repository import (
    all_finished_fixtures,
    fixture_stats_for_fixtures,
    fixtures_recent_by_team,
)

logger = logging.getLogger(__name__)

_ELO_TTL_SECONDS = 3600
_elo_cache: Dict[str, object] = {"rater": None, "loaded_at": 0.0}


def get_elo_rater(force_refresh: bool = False) -> EloRater:
    now = time.time()
    rater = _elo_cache.get("rater")
    loaded_at = _elo_cache.get("loaded_at", 0.0)
    if not force_refresh and rater is not None and now - loaded_at < _ELO_TTL_SECONDS:
        return rater  # type: ignore[return-value]

    logger.info("Rebuilding Elo ratings from finished fixtures")
    new_rater = EloRater()
    fixtures = all_finished_fixtures()
    new_rater.feed_fixtures(fixtures)
    _elo_cache["rater"] = new_rater
    _elo_cache["loaded_at"] = now
    logger.info("Elo ready: %d teams rated from %d fixtures", len(new_rater.ratings), len(fixtures))
    return new_rater


def predict_for_fixture(fixture: dict, elo: Optional[EloRater] = None) -> Optional[MatchPrediction]:
    home_id = fixture.get("home_team_api_id")
    away_id = fixture.get("away_team_api_id")
    if home_id is None or away_id is None:
        return None

    home_recent = fixtures_recent_by_team(home_id, limit=20)
    away_recent = fixtures_recent_by_team(away_id, limit=20)
    fixture_ids = [
        f["api_id"]
        for f in (home_recent + away_recent)
        if f.get("api_id") is not None
    ]
    stats = fixture_stats_for_fixtures(fixture_ids)

    home_form = compute_team_form(home_recent, stats, home_id, n=10)
    away_form = compute_team_form(away_recent, stats, away_id, n=10)

    # Drop predictions for teams with no historical data — would be noise.
    if home_form.matches == 0 or away_form.matches == 0:
        return None

    return predict_match(home_form, away_form, elo=elo)


def predictions_for_fixtures(fixtures: List[dict]) -> List[dict]:
    if not fixtures:
        return []
    elo = get_elo_rater()
    out = []
    for fx in fixtures:
        try:
            pred = predict_for_fixture(fx, elo=elo)
        except Exception:
            logger.exception("Prediction failed for fixture %s", fx.get("api_id"))
            pred = None
        out.append({"fixture": fx, "prediction": pred})
    return out
