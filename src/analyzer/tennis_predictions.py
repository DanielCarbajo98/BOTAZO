"""Tennis prediction service.

Builds the surface-aware Elo by replaying every finished tennis match in
Supabase (cached for 6h since these don't change intra-day) and exposes
predict_tennis_match() returning probabilities for the two-outcome market.

We support a single market for now: head-to-head (player1 wins / player2
wins). This maps cleanly to The Odds API's tennis h2h market.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

from src.collectors.tennis_sackmann import player_api_id
from src.models.tennis_elo import TennisEloRater, expected_win
from src.storage.repository import all_finished_tennis_matches

logger = logging.getLogger(__name__)


_RATER_TTL_SECONDS = 6 * 3600
_rater_cache: Dict[str, object] = {"rater": None, "loaded_at": 0.0}


def get_tennis_rater(force_refresh: bool = False) -> TennisEloRater:
    now = time.time()
    rater = _rater_cache.get("rater")
    loaded_at = _rater_cache.get("loaded_at", 0.0)
    if not force_refresh and rater is not None and now - loaded_at < _RATER_TTL_SECONDS:
        return rater  # type: ignore[return-value]

    logger.info("Rebuilding tennis Elo from finished tennis_matches")
    matches = all_finished_tennis_matches()
    new_rater = TennisEloRater()

    # Convert raw rows -> dicts the rater understands
    plays: List[dict] = []
    for m in matches:
        winner = m.get("winner_api_id")
        p1 = m.get("player1_api_id")
        p2 = m.get("player2_api_id")
        if winner is None or p1 is None or p2 is None:
            continue
        loser = p2 if winner == p1 else p1
        plays.append(
            {
                "winner_api_id": winner,
                "loser_api_id": loser,
                "surface": m.get("surface"),
            }
        )

    new_rater.feed_matches(plays)
    _rater_cache["rater"] = new_rater
    _rater_cache["loaded_at"] = now
    logger.info(
        "Tennis Elo ready: %d players rated from %d matches",
        len(new_rater.ratings),
        len(plays),
    )
    return new_rater


def predict_match(
    tour: str,
    player1_name: str,
    player2_name: str,
    surface: Optional[str] = None,
    rater: Optional[TennisEloRater] = None,
) -> Dict[str, float]:
    """Probability that player1 wins. Returns dict {p1_win, p2_win}."""
    r = rater or get_tennis_rater()
    p1_id = player_api_id(tour, player1_name)
    p2_id = player_api_id(tour, player2_name)
    p1_rating = r.get(p1_id).playable(surface)
    p2_rating = r.get(p2_id).playable(surface)
    p1_win = expected_win(p1_rating, p2_rating)
    return {
        "player1_win": p1_win,
        "player2_win": 1.0 - p1_win,
        "p1_rating": p1_rating,
        "p2_rating": p2_rating,
    }
