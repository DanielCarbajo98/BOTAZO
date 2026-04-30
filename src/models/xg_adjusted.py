"""Aggregate recent xG (and goals as fallback) into per-team form metrics.

The Poisson model needs an attack rate (expected goals scored) and a defense
rate (expected goals conceded) per team. xG from Understat is the cleanest
signal because it strips finishing luck. Where xG is missing we fall back to
actual goals — noisier but always available.
"""
from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Iterable, List, Optional

# League-wide baseline used when a team has too little history. Roughly the
# average goals-per-team-per-match across top-5 European leagues in recent
# seasons (~1.4). Used both as a fallback and as the denominator when scaling
# attack/defense relative to league level.
LEAGUE_AVG_XG = 1.40


@dataclass(frozen=True)
class TeamForm:
    team_id: int
    matches: int
    avg_xg_for: float
    avg_xg_against: float
    avg_goals_for: float
    avg_goals_against: float
    used_xg: bool  # True if at least one match had real xG, False if only goals

    @property
    def attack_strength(self) -> float:
        """Attack rate normalised to league average (1.0 = league avg)."""
        signal = self.avg_xg_for if self.used_xg else self.avg_goals_for
        return signal / LEAGUE_AVG_XG if LEAGUE_AVG_XG > 0 else 1.0

    @property
    def defense_weakness(self) -> float:
        """Goals conceded rate normalised to league average. Higher = leakier."""
        signal = self.avg_xg_against if self.used_xg else self.avg_goals_against
        return signal / LEAGUE_AVG_XG if LEAGUE_AVG_XG > 0 else 1.0


def league_baseline_form(team_id: int) -> TeamForm:
    return TeamForm(
        team_id=team_id,
        matches=0,
        avg_xg_for=LEAGUE_AVG_XG,
        avg_xg_against=LEAGUE_AVG_XG,
        avg_goals_for=LEAGUE_AVG_XG,
        avg_goals_against=LEAGUE_AVG_XG,
        used_xg=False,
    )


def compute_team_form(
    fixtures: Iterable[dict],
    fixture_stats_by_id: dict,
    team_id: int,
    n: int = 10,
) -> TeamForm:
    """Compute form from the last `n` finished fixtures involving the team."""
    finished: List[dict] = []
    for fx in sorted(
        (f for f in fixtures if f.get("status") == "finished"),
        key=lambda f: f.get("date") or "",
        reverse=True,
    ):
        if team_id not in (fx.get("home_team_api_id"), fx.get("away_team_api_id")):
            continue
        finished.append(fx)
        if len(finished) >= n:
            break

    if not finished:
        return league_baseline_form(team_id)

    xg_for: List[float] = []
    xg_against: List[float] = []
    goals_for: List[int] = []
    goals_against: List[int] = []

    for fx in finished:
        is_home = fx.get("home_team_api_id") == team_id
        sh, sa = fx.get("score_home"), fx.get("score_away")
        if sh is not None and sa is not None:
            goals_for.append(sh if is_home else sa)
            goals_against.append(sa if is_home else sh)

        stats = fixture_stats_by_id.get(fx.get("api_id"))
        if not stats:
            continue
        xh = stats.get("xg_home")
        xa = stats.get("xg_away")
        if xh is not None and xa is not None:
            xg_for.append(float(xh) if is_home else float(xa))
            xg_against.append(float(xa) if is_home else float(xh))

    used_xg = len(xg_for) >= max(3, len(finished) // 2)

    return TeamForm(
        team_id=team_id,
        matches=len(finished),
        avg_xg_for=mean(xg_for) if xg_for else (mean(goals_for) if goals_for else LEAGUE_AVG_XG),
        avg_xg_against=mean(xg_against) if xg_against else (mean(goals_against) if goals_against else LEAGUE_AVG_XG),
        avg_goals_for=mean(goals_for) if goals_for else LEAGUE_AVG_XG,
        avg_goals_against=mean(goals_against) if goals_against else LEAGUE_AVG_XG,
        used_xg=used_xg,
    )
