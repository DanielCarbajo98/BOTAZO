"""Combined predictor: xG-based Poisson lambdas, Dixon-Coles correction,
optionally blended with an Elo prior.

The Poisson model alone is sensitive to a handful of recent matches. Elo
provides a longer-term anchor that stops a team's prediction from swinging
wildly after one big loss or a soft fixture run. We blend the two by
nudging the Poisson home-win probability toward the Elo win probability
with a fixed weight.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from src.models.elo import EloRater
from src.models.poisson import market_probabilities, score_matrix
from src.models.xg_adjusted import LEAGUE_AVG_XG, TeamForm

HOME_ADVANTAGE_LAMBDA = 1.20  # ~+20% expected goals at home
ELO_BLEND_WEIGHT = 0.30       # how much weight Elo gets in the 1X2 blend


def expected_goals(
    attacker_form: TeamForm,
    defender_form: TeamForm,
    is_home: bool,
) -> float:
    """λ = league_avg * attacker_strength * defender_weakness * home_factor."""
    home_factor = HOME_ADVANTAGE_LAMBDA if is_home else 1.0
    return (
        LEAGUE_AVG_XG
        * attacker_form.attack_strength
        * defender_form.defense_weakness
        * home_factor
    )


def blend_with_elo(
    home_win: float,
    away_win: float,
    draw: float,
    elo_home_win: Optional[float],
    weight: float = ELO_BLEND_WEIGHT,
) -> Dict[str, float]:
    """Pull Poisson win probs toward the Elo home-win prior. Draw rescaled."""
    if elo_home_win is None:
        return {"home_win": home_win, "draw": draw, "away_win": away_win}

    target_home = (1 - weight) * home_win + weight * elo_home_win
    target_away = (1 - weight) * away_win + weight * (1 - elo_home_win - draw)
    target_draw = max(0.0, 1.0 - target_home - target_away)
    total = target_home + target_away + target_draw
    if total <= 0:
        return {"home_win": home_win, "draw": draw, "away_win": away_win}
    return {
        "home_win": target_home / total,
        "draw": target_draw / total,
        "away_win": target_away / total,
    }


@dataclass
class MatchPrediction:
    home_team_id: int
    away_team_id: int
    lambda_home: float
    lambda_away: float
    probabilities: Dict[str, float]
    home_form: TeamForm
    away_form: TeamForm
    elo_home: Optional[float] = None
    elo_away: Optional[float] = None

    def summary(self) -> Dict[str, float]:
        return {
            "lambda_home": round(self.lambda_home, 3),
            "lambda_away": round(self.lambda_away, 3),
            **{k: round(v, 4) for k, v in self.probabilities.items()},
        }


def predict_match(
    home_form: TeamForm,
    away_form: TeamForm,
    elo: Optional[EloRater] = None,
) -> MatchPrediction:
    lam_home = expected_goals(home_form, away_form, is_home=True)
    lam_away = expected_goals(away_form, home_form, is_home=False)

    matrix = score_matrix(lam_home, lam_away)
    probs = market_probabilities(matrix)

    elo_home = elo_away = None
    if elo is not None:
        elo_home = elo.get(home_form.team_id)
        elo_away = elo.get(away_form.team_id)
        elo_home_win = elo.win_probability(home_form.team_id, away_form.team_id)
        blended = blend_with_elo(
            probs["home_win"], probs["away_win"], probs["draw"], elo_home_win
        )
        probs.update(blended)

    return MatchPrediction(
        home_team_id=home_form.team_id,
        away_team_id=away_form.team_id,
        lambda_home=lam_home,
        lambda_away=lam_away,
        probabilities=probs,
        home_form=home_form,
        away_form=away_form,
        elo_home=elo_home,
        elo_away=elo_away,
    )
