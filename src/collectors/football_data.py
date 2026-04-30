"""football-data.org collector.

Replaces FBref as the primary source for fixtures and results because FBref
blocks Railway's datacenter IPs at the Cloudflare layer. football-data.org
serves the same data as a clean REST API: free tier covers our top 5
leagues plus Champions League at 10 requests/minute.

Auth: per-request `X-Auth-Token` header. Get a key (free) at
https://www.football-data.org/client/register.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional

from src.utils.http import RateLimitedClient
from src.utils.ids import team_id

logger = logging.getLogger(__name__)

BASE_URL = "https://api.football-data.org/v4"

# Free-tier competitions we care about. Code -> (display name, fbref-style id).
COMPETITIONS = {
    "PL": ("Premier League", 9),
    "PD": ("La Liga", 12),
    "SA": ("Serie A", 11),
    "BL1": ("Bundesliga", 20),
    "FL1": ("Ligue 1", 13),
    "CL": ("Champions League", 8),
}

# football-data status -> our internal status string for the fixtures table.
_STATUS_MAP = {
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "POSTPONED": "postponed",
    "CANCELLED": "cancelled",
    "SUSPENDED": "suspended",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "LIVE": "live",
    "FINISHED": "finished",
    "AWARDED": "finished",
}


@dataclass
class FootballDataMatch:
    api_id: int
    date_iso: str
    league_id: int
    league_name: str
    league_code: str
    season: str
    home_team_api_id: int
    away_team_api_id: int
    home_team_name: str
    away_team_name: str
    status: str
    score_home: Optional[int]
    score_away: Optional[int]
    matchday: Optional[int]
    stage: Optional[str]

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
        }


def _parse_kickoff(utc_date: str) -> Optional[str]:
    if not utc_date:
        return None
    try:
        cleaned = utc_date.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned).isoformat()
    except (ValueError, TypeError):
        return None


def parse_matches_payload(
    payload: dict, league_code: str, league_id: int, league_name: str
) -> List[FootballDataMatch]:
    matches_raw = payload.get("matches") or []
    season_obj = payload.get("filters", {}) or {}
    season = str(season_obj.get("season") or payload.get("season", {}).get("startDate", "")[:4] or "")

    out: List[FootballDataMatch] = []
    for entry in matches_raw:
        try:
            home = entry["homeTeam"]["name"]
            away = entry["awayTeam"]["name"]
            kickoff = _parse_kickoff(entry.get("utcDate"))
            if kickoff is None or not home or not away:
                continue

            score = (entry.get("score") or {}).get("fullTime") or {}
            status = _STATUS_MAP.get(entry.get("status", ""), "scheduled")

            out.append(
                FootballDataMatch(
                    api_id=int(entry["id"]),
                    date_iso=kickoff,
                    league_id=league_id,
                    league_name=league_name,
                    league_code=league_code,
                    season=season,
                    home_team_api_id=team_id(home),
                    away_team_api_id=team_id(away),
                    home_team_name=home,
                    away_team_name=away,
                    status=status,
                    score_home=score.get("home"),
                    score_away=score.get("away"),
                    matchday=entry.get("matchday"),
                    stage=entry.get("stage"),
                )
            )
        except (KeyError, ValueError, TypeError):
            logger.exception("football-data: skipping malformed match")
            continue

    return out


def teams_from_matches(matches: Iterable[FootballDataMatch]) -> List[dict]:
    seen: dict[int, dict] = {}
    for m in matches:
        for tid, name, league_id, league_name in (
            (m.home_team_api_id, m.home_team_name, m.league_id, m.league_name),
            (m.away_team_api_id, m.away_team_name, m.league_id, m.league_name),
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


class FootballDataCollector:
    def __init__(self, client: RateLimitedClient, api_key: str) -> None:
        if not api_key:
            raise ValueError("football-data api_key is required")
        self.client = client
        self.api_key = api_key

    def _headers(self) -> dict:
        # Override the browser Accept with JSON; keep the X-Auth-Token here.
        return {
            "X-Auth-Token": self.api_key,
            "Accept": "application/json",
        }

    async def fetch_competition(self, code: str) -> List[FootballDataMatch]:
        league_name, league_id = COMPETITIONS[code]
        url = f"{BASE_URL}/competitions/{code}/matches"
        logger.info("football-data fetching %s (%s)", league_name, code)
        try:
            response = await self.client.get(url, headers=self._headers())
            response.raise_for_status()
            payload = response.json()
        except Exception:
            logger.exception("football-data fetch failed for %s", code)
            return []
        matches = parse_matches_payload(payload, code, league_id, league_name)
        logger.info("football-data %s: %d matches parsed", league_name, len(matches))
        return matches

    async def fetch_all(self) -> List[FootballDataMatch]:
        out: List[FootballDataMatch] = []
        for code in COMPETITIONS:
            out.extend(await self.fetch_competition(code))
        return out
