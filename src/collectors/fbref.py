"""FBref scraper.

Pulls fixtures (past and upcoming) from the top European leagues. FBref
serves the schedule as plain HTML tables. Some auxiliary tables are wrapped
inside HTML comments — we strip those wrappers before parsing.

Rate limit: 3s between requests, enforced by the shared RateLimitedClient.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, time
from typing import Iterable, List, Optional

from bs4 import BeautifulSoup, Comment

from src.utils.http import RateLimitedClient
from src.utils.ids import fixture_id, team_id

logger = logging.getLogger(__name__)

LEAGUES = {
    9: ("Premier League", "Premier-League", "ENG"),
    12: ("La Liga", "La-Liga", "ESP"),
    11: ("Serie A", "Serie-A", "ITA"),
    20: ("Bundesliga", "Bundesliga", "GER"),
    13: ("Ligue 1", "Ligue-1", "FRA"),
    8: ("Champions League", "Champions-League", "EUR"),
    19: ("Europa League", "Europa-League", "EUR"),
}

BASE_URL = "https://fbref.com"


@dataclass
class FBrefFixture:
    api_id: int
    date_iso: str
    league_id: int
    league_name: str
    season: str
    home_team_api_id: int
    away_team_api_id: int
    home_team_name: str
    away_team_name: str
    status: str  # 'scheduled' | 'finished'
    score_home: Optional[int]
    score_away: Optional[int]
    venue: Optional[str]
    referee: Optional[str]

    def as_row(self) -> dict:
        return {
            "api_id": self.api_id,
            "date": self.date_iso,
            "league_id": self.league_id,
            "league_name": self.league_name,
            "season": self.season,
            "home_team_api_id": self.home_team_api_id,
            "away_team_api_id": self.away_team_api_id,
            "home_team_name": self.home_team_name,
            "away_team_name": self.away_team_name,
            "status": self.status,
            "score_home": self.score_home,
            "score_away": self.score_away,
            "venue": self.venue,
            "referee": self.referee,
        }


def _expand_html_comments(soup: BeautifulSoup) -> None:
    """FBref hides some tables inside HTML comments. Re-parse them in place."""
    for comment in soup.find_all(string=lambda s: isinstance(s, Comment)):
        text = str(comment)
        if "<table" in text:
            try:
                fragment = BeautifulSoup(text, "lxml")
                comment.replace_with(fragment)
            except Exception:
                logger.debug("Could not expand FBref comment fragment", exc_info=True)


def _parse_score(score_text: Optional[str]) -> tuple[Optional[int], Optional[int]]:
    if not score_text:
        return None, None
    cleaned = score_text.strip().replace("–", "-").replace("—", "-")
    match = re.match(r"^\s*(\d+)\s*-\s*(\d+)\s*$", cleaned)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _parse_kickoff(date_text: str, time_text: str) -> Optional[str]:
    if not date_text:
        return None
    try:
        d = datetime.strptime(date_text.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None

    t = time(0, 0)
    if time_text:
        cleaned = time_text.strip().split(" ")[0]
        for fmt in ("%H:%M", "%I:%M%p"):
            try:
                t = datetime.strptime(cleaned, fmt).time()
                break
            except ValueError:
                continue
    return datetime.combine(d, t).isoformat()


def parse_fixtures_html(
    html: str,
    league_id: int,
    league_name: str,
    season: str,
) -> List[FBrefFixture]:
    soup = BeautifulSoup(html, "lxml")
    _expand_html_comments(soup)

    table = soup.find("table", id=re.compile(r"^sched_"))
    if table is None:
        table = soup.find("table", class_=re.compile(r"sched"))
    if table is None:
        logger.warning("No schedule table found for league_id=%s", league_id)
        return []

    rows = table.find("tbody").find_all("tr") if table.find("tbody") else []
    fixtures: List[FBrefFixture] = []

    for row in rows:
        if "spacer" in (row.get("class") or []) or "thead" in (row.get("class") or []):
            continue

        def cell(stat: str) -> Optional[str]:
            el = row.find(["td", "th"], attrs={"data-stat": stat})
            if el is None:
                return None
            return el.get_text(strip=True)

        date_text = cell("date") or ""
        if not date_text:
            continue

        home = cell("home_team") or ""
        away = cell("away_team") or ""
        if not home or not away:
            continue

        time_text = cell("start_time") or ""
        kickoff = _parse_kickoff(date_text, time_text)
        if kickoff is None:
            continue

        score_home, score_away = _parse_score(cell("score"))
        status = "finished" if score_home is not None else "scheduled"

        fix = FBrefFixture(
            api_id=fixture_id(date_text, home, away),
            date_iso=kickoff,
            league_id=league_id,
            league_name=league_name,
            season=season,
            home_team_api_id=team_id(home),
            away_team_api_id=team_id(away),
            home_team_name=home,
            away_team_name=away,
            status=status,
            score_home=score_home,
            score_away=score_away,
            venue=cell("venue"),
            referee=cell("referee"),
        )
        fixtures.append(fix)

    return fixtures


def teams_from_fixtures(fixtures: Iterable[FBrefFixture]) -> List[dict]:
    seen: dict[int, dict] = {}
    for fx in fixtures:
        for tid, name, league_id, league_name in (
            (fx.home_team_api_id, fx.home_team_name, fx.league_id, fx.league_name),
            (fx.away_team_api_id, fx.away_team_name, fx.league_id, fx.league_name),
        ):
            if tid in seen:
                continue
            seen[tid] = {
                "api_id": tid,
                "name": name,
                "short_name": name,
                "league_id": league_id,
                "league_name": league_name,
            }
    return list(seen.values())


class FBrefCollector:
    def __init__(self, client: RateLimitedClient, season: str = "2025-2026") -> None:
        self.client = client
        self.season = season

    def schedule_url(self, league_id: int, slug: str) -> str:
        return (
            f"{BASE_URL}/en/comps/{league_id}/schedule/"
            f"{slug}-Scores-and-Fixtures"
        )

    async def fetch_league_fixtures(self, league_id: int) -> List[FBrefFixture]:
        league_name, slug, _ = LEAGUES[league_id]
        url = self.schedule_url(league_id, slug)
        logger.info("FBref fetching fixtures for %s (%s)", league_name, url)
        try:
            response = await self.client.get(url)
            response.raise_for_status()
        except Exception:
            logger.exception("FBref fetch failed for league %s", league_name)
            return []
        return parse_fixtures_html(response.text, league_id, league_name, self.season)

    async def fetch_all_fixtures(self) -> List[FBrefFixture]:
        all_fixtures: List[FBrefFixture] = []
        for league_id in LEAGUES:
            fixtures = await self.fetch_league_fixtures(league_id)
            all_fixtures.extend(fixtures)
            logger.info(
                "FBref %s: %d fixtures parsed",
                LEAGUES[league_id][0],
                len(fixtures),
            )
        return all_fixtures
