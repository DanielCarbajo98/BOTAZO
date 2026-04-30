"""Understat scraper.

Understat embeds match data inside <script> tags as encoded JSON literals
of the form:

    var datesData = JSON.parse('\\x5B...\\x5D');

We extract the JS literal, decode the \\x escapes and parse JSON. No API key,
no auth.
"""
from __future__ import annotations

import codecs
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from src.utils.http import RateLimitedClient
from src.utils.ids import fixture_id, team_id

logger = logging.getLogger(__name__)

BASE_URL = "https://understat.com"

LEAGUES = {
    "EPL": "Premier League",
    "La_liga": "La Liga",
    "Bundesliga": "Bundesliga",
    "Serie_A": "Serie A",
    "Ligue_1": "Ligue 1",
}


@dataclass
class UnderstatMatch:
    api_id: int
    understat_id: str
    date_iso: str
    league_slug: str
    league_name: str
    home_team: str
    away_team: str
    home_xg: Optional[float]
    away_xg: Optional[float]
    home_goals: Optional[int]
    away_goals: Optional[int]
    is_finished: bool


_VAR_PATTERN = re.compile(
    r"var\s+(\w+)\s*=\s*JSON\.parse\(\s*'(?P<payload>(?:\\.|[^'\\])*)'\s*\)\s*;",
    re.DOTALL,
)


def _decode_js_literal(payload: str) -> str:
    """Decode the JS string literal: handles \\xHH, \\uHHHH, \\n, \\', etc."""
    return codecs.decode(payload, "unicode_escape")


def extract_js_var(html: str, var_name: str) -> Optional[object]:
    for match in _VAR_PATTERN.finditer(html):
        if match.group(1) != var_name:
            continue
        raw = match.group("payload")
        try:
            decoded = _decode_js_literal(raw)
            return json.loads(decoded)
        except (ValueError, json.JSONDecodeError):
            logger.exception("Failed to decode Understat var %s", var_name)
            return None
    return None


def _to_float(value) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_league_matches(
    html: str, league_slug: str, league_name: str
) -> List[UnderstatMatch]:
    raw = extract_js_var(html, "datesData")
    if not raw or not isinstance(raw, list):
        logger.warning("Understat: datesData missing for %s", league_slug)
        return []

    matches: List[UnderstatMatch] = []
    for entry in raw:
        try:
            home = entry["h"]["title"]
            away = entry["a"]["title"]
            datetime_str = entry["datetime"]
            kickoff = datetime.fromisoformat(datetime_str.replace(" ", "T"))
            iso = kickoff.isoformat()
            xg = entry.get("xG", {}) or {}
            goals = entry.get("goals", {}) or {}

            matches.append(
                UnderstatMatch(
                    api_id=fixture_id(kickoff.date().isoformat(), home, away),
                    understat_id=str(entry.get("id", "")),
                    date_iso=iso,
                    league_slug=league_slug,
                    league_name=league_name,
                    home_team=home,
                    away_team=away,
                    home_xg=_to_float(xg.get("h")),
                    away_xg=_to_float(xg.get("a")),
                    home_goals=_to_int(goals.get("h")),
                    away_goals=_to_int(goals.get("a")),
                    is_finished=bool(entry.get("isResult", False)),
                )
            )
        except (KeyError, ValueError, TypeError):
            logger.exception("Understat: skipping malformed match entry")
            continue

    return matches


def fixture_stats_rows(matches: List[UnderstatMatch]) -> List[dict]:
    """Convert finished matches with xG into fixture_stats rows."""
    rows = []
    for m in matches:
        if not m.is_finished:
            continue
        if m.home_xg is None and m.away_xg is None:
            continue
        rows.append(
            {
                "fixture_api_id": m.api_id,
                "xg_home": m.home_xg,
                "xg_away": m.away_xg,
            }
        )
    return rows


def teams_from_matches(matches: List[UnderstatMatch]) -> List[dict]:
    seen: dict[int, dict] = {}
    for m in matches:
        for name in (m.home_team, m.away_team):
            tid = team_id(name)
            if tid in seen:
                continue
            seen[tid] = {
                "api_id": tid,
                "name": name,
                "short_name": name,
                "league_name": m.league_name,
            }
    return list(seen.values())


class UnderstatCollector:
    def __init__(self, client: RateLimitedClient, season: int = 2025) -> None:
        self.client = client
        self.season = season

    def league_url(self, slug: str) -> str:
        return f"{BASE_URL}/league/{slug}/{self.season}"

    async def fetch_league(self, slug: str) -> List[UnderstatMatch]:
        league_name = LEAGUES.get(slug, slug)
        url = self.league_url(slug)
        logger.info("Understat fetching %s (%s)", league_name, url)
        try:
            response = await self.client.get(url)
            response.raise_for_status()
        except Exception:
            logger.exception("Understat fetch failed for %s", slug)
            return []
        return parse_league_matches(response.text, slug, league_name)

    async def fetch_all(self) -> List[UnderstatMatch]:
        out: List[UnderstatMatch] = []
        for slug in LEAGUES:
            out.extend(await self.fetch_league(slug))
        return out
