"""Tennis Elo model with surface variants.

Each player carries four ratings: overall, plus per-surface (Clay, Hard,
Grass). The "playable" rating for a match blends the overall and the
relevant surface 50/50 — pure surface Elo is too noisy for players who
haven't played enough on it; pure overall ignores well-known surface
specialisation (Nadal on clay, etc.).

K-factor decays with experience to avoid early-career rating oscillation.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, Iterable, Optional

INITIAL_RATING = 1500.0
K_BASE = 32.0
SURFACE_BLEND = 0.5  # weight of surface Elo in the playable rating

VALID_SURFACES = {"Clay", "Hard", "Grass"}


@dataclass
class PlayerRating:
    overall: float = INITIAL_RATING
    clay: float = INITIAL_RATING
    hard: float = INITIAL_RATING
    grass: float = INITIAL_RATING
    matches: int = 0
    surface_matches: Dict[str, int] = field(default_factory=lambda: {"Clay": 0, "Hard": 0, "Grass": 0})

    def surface(self, surface: Optional[str]) -> float:
        if surface == "Clay":
            return self.clay
        if surface == "Hard":
            return self.hard
        if surface == "Grass":
            return self.grass
        return self.overall

    def playable(self, surface: Optional[str]) -> float:
        if surface in VALID_SURFACES:
            return SURFACE_BLEND * self.surface(surface) + (1 - SURFACE_BLEND) * self.overall
        return self.overall


def expected_win(rating_a: float, rating_b: float) -> float:
    return 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))


def _k_for(matches: int) -> float:
    """Decay K with experience: rookies move fast, veterans slow."""
    return K_BASE / (1.0 + matches / 50.0)


class TennisEloRater:
    def __init__(self) -> None:
        self.ratings: Dict[int, PlayerRating] = {}

    def get(self, player_api_id: int) -> PlayerRating:
        rating = self.ratings.get(player_api_id)
        if rating is None:
            rating = PlayerRating()
            self.ratings[player_api_id] = rating
        return rating

    def expected(self, winner_api_id: int, loser_api_id: int, surface: Optional[str] = None) -> float:
        rw = self.get(winner_api_id).playable(surface)
        rl = self.get(loser_api_id).playable(surface)
        return expected_win(rw, rl)

    def update_match(
        self,
        winner_api_id: int,
        loser_api_id: int,
        surface: Optional[str],
    ) -> None:
        winner = self.get(winner_api_id)
        loser = self.get(loser_api_id)

        kw = _k_for(winner.matches)
        kl = _k_for(loser.matches)

        # Overall update
        ew = expected_win(winner.overall, loser.overall)
        winner.overall += kw * (1.0 - ew)
        loser.overall += kl * (0.0 - (1.0 - ew))

        # Surface update — only if surface is known and recognised
        if surface in VALID_SURFACES:
            wr = winner.surface(surface)
            lr = loser.surface(surface)
            ews = expected_win(wr, lr)
            new_wr = wr + kw * (1.0 - ews)
            new_lr = lr + kl * (0.0 - (1.0 - ews))
            if surface == "Clay":
                winner.clay = new_wr
                loser.clay = new_lr
            elif surface == "Hard":
                winner.hard = new_wr
                loser.hard = new_lr
            elif surface == "Grass":
                winner.grass = new_wr
                loser.grass = new_lr
            winner.surface_matches[surface] = winner.surface_matches.get(surface, 0) + 1
            loser.surface_matches[surface] = loser.surface_matches.get(surface, 0) + 1

        winner.matches += 1
        loser.matches += 1

    def feed_matches(self, matches: Iterable[dict]) -> int:
        """Replay matches in date order. Each match dict must have:
        winner_api_id, loser_api_id, surface (optional).

        Returns number of matches successfully processed.
        """
        count = 0
        for m in matches:
            winner_id = m.get("winner_api_id")
            loser_id = m.get("loser_api_id")
            if winner_id is None or loser_id is None:
                continue
            self.update_match(winner_id, loser_id, m.get("surface"))
            count += 1
        return count

    def snapshot(self) -> list[dict]:
        return [
            {
                "player_api_id": pid,
                "elo": round(r.overall, 2),
                "elo_clay": round(r.clay, 2),
                "elo_hard": round(r.hard, 2),
                "elo_grass": round(r.grass, 2),
                "matches_played": r.matches,
            }
            for pid, r in self.ratings.items()
        ]
