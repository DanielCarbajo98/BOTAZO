"""Football Elo with home advantage and goal-difference scaled K-factor.

Walks finished fixtures chronologically, updating each team's rating after
the result. New teams start at 1500. Standard formulation:

    expected = 1 / (1 + 10 ^ ((R_b - (R_a + home_adv)) / 400))
    delta    = K * G(goal_diff) * (actual - expected)

where actual is 1/0.5/0 for win/draw/loss. G(d) is a margin scaler that
rewards convincing wins less aggressively than crushing wins.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Tuple

DEFAULT_RATING = 1500.0
HOME_ADVANTAGE_ELO = 65.0  # ~empirical for European leagues
K_FACTOR = 20.0


def _goal_diff_factor(goal_diff: int) -> float:
    abs_diff = abs(goal_diff)
    if abs_diff <= 1:
        return 1.0
    if abs_diff == 2:
        return 1.5
    return (11.0 + abs_diff) / 8.0


def expected_score(rating_a: float, rating_b: float, home_adv: float = 0.0) -> float:
    """P(team A scores higher than B) given Elo ratings and home advantage."""
    return 1.0 / (1.0 + 10.0 ** ((rating_b - (rating_a + home_adv)) / 400.0))


def update_pair(
    home_rating: float,
    away_rating: float,
    home_goals: int,
    away_goals: int,
    k: float = K_FACTOR,
    home_adv: float = HOME_ADVANTAGE_ELO,
) -> Tuple[float, float]:
    if home_goals > away_goals:
        actual = 1.0
    elif home_goals < away_goals:
        actual = 0.0
    else:
        actual = 0.5
    expected = expected_score(home_rating, away_rating, home_adv)
    delta = k * _goal_diff_factor(home_goals - away_goals) * (actual - expected)
    return home_rating + delta, away_rating - delta


@dataclass
class EloRater:
    ratings: Dict[int, float] = field(default_factory=dict)
    default: float = DEFAULT_RATING

    def get(self, team_id: int) -> float:
        return self.ratings.get(team_id, self.default)

    def update_from_match(
        self, home_id: int, away_id: int, home_goals: int, away_goals: int
    ) -> None:
        home = self.get(home_id)
        away = self.get(away_id)
        new_home, new_away = update_pair(home, away, home_goals, away_goals)
        self.ratings[home_id] = new_home
        self.ratings[away_id] = new_away

    def feed_fixtures(self, fixtures: Iterable[dict]) -> None:
        """Replay finished fixtures in chronological order to populate ratings."""
        finished = [
            f for f in fixtures
            if f.get("status") == "finished"
            and f.get("score_home") is not None
            and f.get("score_away") is not None
            and f.get("home_team_api_id") is not None
            and f.get("away_team_api_id") is not None
        ]
        finished.sort(key=lambda f: f.get("date") or "")
        for fx in finished:
            self.update_from_match(
                fx["home_team_api_id"],
                fx["away_team_api_id"],
                int(fx["score_home"]),
                int(fx["score_away"]),
            )

    def win_probability(self, home_id: int, away_id: int) -> float:
        return expected_score(self.get(home_id), self.get(away_id), HOME_ADVANTAGE_ELO)
