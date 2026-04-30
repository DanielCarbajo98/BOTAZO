"""Sackmann CSV collector.

Jeff Sackmann maintains free public CSV files of every ATP and WTA match
on GitHub:

    https://github.com/JeffSackmann/tennis_atp
    https://github.com/JeffSackmann/tennis_wta

We download the per-year files via the raw.githubusercontent.com mirror,
parse them with csv.DictReader and emit canonical match dicts.

We do NOT scrape the GitHub website — we hit the raw CDN, which is
explicitly free and unlimited (per GitHub's docs).
"""
from __future__ import annotations

import csv
import io
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional

from src.utils.http import RateLimitedClient
from src.utils.ids import stable_int_id

logger = logging.getLogger(__name__)

ATP_URL = "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_{year}.csv"
WTA_URL = "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_matches_{year}.csv"


def player_api_id(tour: str, name: str, sackmann_id: Optional[str] = None) -> int:
    """Stable integer id for a tennis player. Uses Sackmann's id when
    available (rock solid), otherwise falls back to tour+normalized name.
    """
    if sackmann_id:
        return stable_int_id("tennis_player", tour, sackmann_id)
    return stable_int_id("tennis_player", tour, name)


def match_api_id(tour: str, date_iso: str, p1_name: str, p2_name: str) -> int:
    pair = "|".join(sorted([p1_name.lower(), p2_name.lower()]))
    return stable_int_id("tennis_match", tour, date_iso, pair)


@dataclass
class SackmannMatch:
    api_id: int
    date_iso: str
    tour: str
    tournament: str
    surface: Optional[str]
    round: Optional[str]
    winner_api_id: int
    loser_api_id: int
    winner_name: str
    loser_name: str
    winner_sackmann_id: Optional[str]
    loser_sackmann_id: Optional[str]
    winner_country: Optional[str]
    loser_country: Optional[str]
    winner_hand: Optional[str]
    loser_hand: Optional[str]
    winner_height: Optional[int]
    loser_height: Optional[int]
    score: Optional[str]


def _parse_date(yyyymmdd: str) -> Optional[str]:
    if not yyyymmdd or len(yyyymmdd) != 8:
        return None
    try:
        return datetime.strptime(yyyymmdd, "%Y%m%d").date().isoformat()
    except ValueError:
        return None


def _to_int(value: Optional[str]) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def parse_csv(text: str, tour: str) -> List[SackmannMatch]:
    out: List[SackmannMatch] = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        date_iso = _parse_date(row.get("tourney_date", ""))
        winner_name = (row.get("winner_name") or "").strip()
        loser_name = (row.get("loser_name") or "").strip()
        if not date_iso or not winner_name or not loser_name:
            continue

        winner_sackmann = row.get("winner_id") or None
        loser_sackmann = row.get("loser_id") or None

        out.append(
            SackmannMatch(
                api_id=match_api_id(tour, date_iso, winner_name, loser_name),
                date_iso=f"{date_iso}T00:00:00",
                tour=tour,
                tournament=(row.get("tourney_name") or "").strip(),
                surface=(row.get("surface") or "").strip() or None,
                round=(row.get("round") or "").strip() or None,
                winner_api_id=player_api_id(tour, winner_name, winner_sackmann),
                loser_api_id=player_api_id(tour, loser_name, loser_sackmann),
                winner_name=winner_name,
                loser_name=loser_name,
                winner_sackmann_id=winner_sackmann,
                loser_sackmann_id=loser_sackmann,
                winner_country=(row.get("winner_ioc") or "").strip() or None,
                loser_country=(row.get("loser_ioc") or "").strip() or None,
                winner_hand=(row.get("winner_hand") or "").strip() or None,
                loser_hand=(row.get("loser_hand") or "").strip() or None,
                winner_height=_to_int(row.get("winner_ht")),
                loser_height=_to_int(row.get("loser_ht")),
                score=(row.get("score") or "").strip() or None,
            )
        )
    return out


class SackmannCollector:
    def __init__(self, client: RateLimitedClient) -> None:
        self.client = client

    async def fetch_year(self, tour: str, year: int) -> List[SackmannMatch]:
        url = (ATP_URL if tour == "ATP" else WTA_URL).format(year=year)
        logger.info("Sackmann fetching %s %d (%s)", tour, year, url)
        try:
            response = await self.client.get(url, headers={"Accept": "text/csv"})
            response.raise_for_status()
        except Exception:
            logger.exception("Sackmann fetch failed for %s %d", tour, year)
            return []
        matches = parse_csv(response.text, tour)
        logger.info("Sackmann %s %d: %d matches parsed", tour, year, len(matches))
        return matches

    async def fetch_recent(self, tour: str, years: Iterable[int]) -> List[SackmannMatch]:
        out: List[SackmannMatch] = []
        for year in years:
            out.extend(await self.fetch_year(tour, year))
        return out


def players_from_matches(matches: Iterable[SackmannMatch]) -> List[dict]:
    seen: dict[int, dict] = {}
    for m in matches:
        for who in ("winner", "loser"):
            api_id_ = getattr(m, f"{who}_api_id")
            if api_id_ in seen:
                continue
            seen[api_id_] = {
                "api_id": api_id_,
                "sackmann_id": getattr(m, f"{who}_sackmann_id"),
                "tour": m.tour,
                "name": getattr(m, f"{who}_name"),
                "country": getattr(m, f"{who}_country"),
                "hand": getattr(m, f"{who}_hand"),
                "height_cm": getattr(m, f"{who}_height"),
            }
    return list(seen.values())


def matches_to_rows(matches: Iterable[SackmannMatch]) -> List[dict]:
    return [
        {
            "api_id": m.api_id,
            "date": m.date_iso,
            "tour": m.tour,
            "tournament": m.tournament,
            "surface": m.surface,
            "round": m.round,
            # Sackmann provides finished matches only
            "player1_api_id": m.winner_api_id,
            "player2_api_id": m.loser_api_id,
            "player1_name": m.winner_name,
            "player2_name": m.loser_name,
            "winner_api_id": m.winner_api_id,
            "score": m.score,
            "status": "finished",
        }
        for m in matches
    ]
