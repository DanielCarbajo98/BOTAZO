"""Match context: pulls every stat we need to write a tipster-style
narrative for a fixture.

We keep the math obvious (goals scored / received per match, win streaks,
BTTS rate, over 2.5 rate, xG averages, head-to-head record over last N
encounters) so the narrative module can reach for whichever fact is most
relevant to the chosen pick.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, List, Optional

from src.storage.repository import (
    fixture_stats_for_fixtures,
    fixtures_recent_by_team,
    head_to_head_fixtures,
)


@dataclass
class TeamForm:
    team_api_id: int
    matches_considered: int
    last_results: List[str] = field(default_factory=list)  # 'W'/'D'/'L'
    streak: int = 0  # signed: +N consecutive wins, -N consecutive losses
    goals_for: List[int] = field(default_factory=list)
    goals_against: List[int] = field(default_factory=list)
    xg_for: List[float] = field(default_factory=list)
    xg_against: List[float] = field(default_factory=list)

    @property
    def avg_goals_for(self) -> float:
        return sum(self.goals_for) / len(self.goals_for) if self.goals_for else 0.0

    @property
    def avg_goals_against(self) -> float:
        return sum(self.goals_against) / len(self.goals_against) if self.goals_against else 0.0

    @property
    def avg_xg_for(self) -> float:
        return sum(self.xg_for) / len(self.xg_for) if self.xg_for else 0.0

    @property
    def avg_xg_against(self) -> float:
        return sum(self.xg_against) / len(self.xg_against) if self.xg_against else 0.0

    @property
    def btts_rate(self) -> float:
        if not self.goals_for:
            return 0.0
        n = len(self.goals_for)
        both = sum(1 for i in range(n) if self.goals_for[i] > 0 and self.goals_against[i] > 0)
        return both / n

    @property
    def over_2_5_rate(self) -> float:
        if not self.goals_for:
            return 0.0
        n = len(self.goals_for)
        over = sum(1 for i in range(n) if (self.goals_for[i] + self.goals_against[i]) >= 3)
        return over / n

    @property
    def wins(self) -> int:
        return sum(1 for r in self.last_results if r == "W")

    @property
    def clean_sheets(self) -> int:
        return sum(1 for ga in self.goals_against if ga == 0)

    def scored_in_last(self, n: int) -> int:
        """How many of the last n matches the team scored at least once."""
        return sum(1 for g in self.goals_for[:n] if g > 0)

    def conceded_in_last(self, n: int) -> int:
        return sum(1 for g in self.goals_against[:n] if g > 0)

    def over_2_5_in_last(self, n: int) -> int:
        sliced = list(zip(self.goals_for[:n], self.goals_against[:n]))
        return sum(1 for gf, ga in sliced if gf + ga >= 3)

    def btts_in_last(self, n: int) -> int:
        sliced = list(zip(self.goals_for[:n], self.goals_against[:n]))
        return sum(1 for gf, ga in sliced if gf > 0 and ga > 0)

    def wins_in_last(self, n: int) -> int:
        return sum(1 for r in self.last_results[:n] if r == "W")

    def losses_in_last(self, n: int) -> int:
        return sum(1 for r in self.last_results[:n] if r == "L")


@dataclass
class HeadToHead:
    team_a_id: int
    team_b_id: int
    fixtures: List[dict] = field(default_factory=list)

    @property
    def matches(self) -> int:
        return len(self.fixtures)

    def _result_from_a(self, fx: dict) -> Optional[str]:
        sh = fx.get("score_home")
        sa = fx.get("score_away")
        if sh is None or sa is None:
            return None
        is_a_home = fx.get("home_team_api_id") == self.team_a_id
        a_score = sh if is_a_home else sa
        b_score = sa if is_a_home else sh
        if a_score > b_score:
            return "A"
        if a_score < b_score:
            return "B"
        return "D"

    @property
    def team_a_wins(self) -> int:
        return sum(1 for fx in self.fixtures if self._result_from_a(fx) == "A")

    @property
    def team_b_wins(self) -> int:
        return sum(1 for fx in self.fixtures if self._result_from_a(fx) == "B")

    @property
    def draws(self) -> int:
        return sum(1 for fx in self.fixtures if self._result_from_a(fx) == "D")

    @property
    def btts_rate(self) -> float:
        if not self.fixtures:
            return 0.0
        both = sum(
            1
            for fx in self.fixtures
            if (fx.get("score_home") or 0) > 0 and (fx.get("score_away") or 0) > 0
        )
        return both / len(self.fixtures)

    @property
    def over_2_5_rate(self) -> float:
        if not self.fixtures:
            return 0.0
        return sum(
            1
            for fx in self.fixtures
            if ((fx.get("score_home") or 0) + (fx.get("score_away") or 0)) >= 3
        ) / len(self.fixtures)

    def team_scored_count(self, team_id: int) -> int:
        """How many H2H fixtures had `team_id` score at least one goal."""
        n = 0
        for fx in self.fixtures:
            sh = fx.get("score_home") or 0
            sa = fx.get("score_away") or 0
            is_home = fx.get("home_team_api_id") == team_id
            own = sh if is_home else sa
            if own > 0:
                n += 1
        return n

    def team_won_count(self, team_id: int) -> int:
        n = 0
        for fx in self.fixtures:
            sh = fx.get("score_home") or 0
            sa = fx.get("score_away") or 0
            is_home = fx.get("home_team_api_id") == team_id
            own = sh if is_home else sa
            other = sa if is_home else sh
            if own > other:
                n += 1
        return n


@dataclass
class MatchContext:
    fixture: dict
    home_form: TeamForm
    away_form: TeamForm
    h2h: HeadToHead


def _result_for(fx: dict, team_id: int) -> Optional[str]:
    sh, sa = fx.get("score_home"), fx.get("score_away")
    if sh is None or sa is None:
        return None
    is_home = fx.get("home_team_api_id") == team_id
    own = sh if is_home else sa
    other = sa if is_home else sh
    if own > other:
        return "W"
    if own < other:
        return "L"
    return "D"


def _streak(results: List[str]) -> int:
    """results in order most-recent-first. Returns +N for wins, -N for losses."""
    if not results:
        return 0
    head = results[0]
    if head == "D":
        return 0
    sign = 1 if head == "W" else -1
    streak = 0
    for r in results:
        if r == head:
            streak += 1
        else:
            break
    return sign * streak


def build_team_form(team_id: int, fixtures: Iterable[dict], stats_lookup: dict, n: int = 10) -> TeamForm:
    finished = [
        fx
        for fx in fixtures
        if fx.get("status") == "finished"
        and fx.get("score_home") is not None
        and fx.get("score_away") is not None
    ]
    finished.sort(key=lambda f: f.get("date") or "", reverse=True)
    finished = finished[:n]

    form = TeamForm(team_api_id=team_id, matches_considered=len(finished))
    results: List[str] = []
    for fx in finished:
        is_home = fx.get("home_team_api_id") == team_id
        sh = fx.get("score_home") or 0
        sa = fx.get("score_away") or 0
        gf = sh if is_home else sa
        ga = sa if is_home else sh
        form.goals_for.append(int(gf))
        form.goals_against.append(int(ga))

        stats = stats_lookup.get(fx.get("api_id")) or {}
        xg_h = stats.get("xg_home")
        xg_a = stats.get("xg_away")
        if xg_h is not None and xg_a is not None:
            form.xg_for.append(float(xg_h if is_home else xg_a))
            form.xg_against.append(float(xg_a if is_home else xg_h))

        result = _result_for(fx, team_id)
        if result is not None:
            results.append(result)

    form.last_results = results
    form.streak = _streak(results)
    return form


def build_match_context(fixture: dict, n: int = 10, h2h_n: int = 5) -> MatchContext:
    home_id = fixture.get("home_team_api_id")
    away_id = fixture.get("away_team_api_id")

    home_recent = fixtures_recent_by_team(home_id, limit=n + 5) if home_id else []
    away_recent = fixtures_recent_by_team(away_id, limit=n + 5) if away_id else []

    fixture_ids = [
        f["api_id"]
        for f in (home_recent + away_recent)
        if f.get("api_id") is not None
    ]
    stats = fixture_stats_for_fixtures(fixture_ids) if fixture_ids else {}

    home_form = build_team_form(home_id or 0, home_recent, stats, n=n)
    away_form = build_team_form(away_id or 0, away_recent, stats, n=n)

    h2h_fixtures = head_to_head_fixtures(home_id or 0, away_id or 0, limit=h2h_n) if (home_id and away_id) else []
    h2h = HeadToHead(team_a_id=home_id or 0, team_b_id=away_id or 0, fixtures=h2h_fixtures)

    return MatchContext(
        fixture=fixture,
        home_form=home_form,
        away_form=away_form,
        h2h=h2h,
    )
