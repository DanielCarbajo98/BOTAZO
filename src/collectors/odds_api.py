"""The Odds API integration.

Free tier: 500 requests/month, no card required, available at
https://the-odds-api.com/. We use far fewer calls than that — once per
day per competition.

Endpoint: GET /v4/sports/{sport_key}/odds
Auth: ?apiKey=<key>
Parameters: regions=eu, markets=h2h,totals,btts (h2h = 1X2)

Returns one JSON object per upcoming match with `bookmakers[].markets[]`.
We map each outcome label into our internal market/outcome strings the
value detector understands.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Iterable, List, Optional

from src.models.value_detector import MarketQuote
from src.utils.http import RateLimitedClient
from src.utils.ids import canonical_team_id, fixture_id, team_id

logger = logging.getLogger(__name__)

BASE_URL = "https://api.the-odds-api.com/v4"

# Map our internal football-data competition codes to The Odds API sport keys.
SPORT_KEYS = {
    "PL": "soccer_epl",
    "PD": "soccer_spain_la_liga",
    "SA": "soccer_italy_serie_a",
    "BL1": "soccer_germany_bundesliga",
    "FL1": "soccer_france_ligue_one",
    "CL": "soccer_uefa_champs_league",
}


def _to_market_outcome(market_key: str, outcome_name: str, point: Optional[float], home: str, away: str):
    """Translate The Odds API's labels into our (market, outcome) tuple."""
    if market_key == "h2h":
        if outcome_name == home:
            return ("1X2", "home_win")
        if outcome_name == away:
            return ("1X2", "away_win")
        if outcome_name == "Draw":
            return ("1X2", "draw")
        return None
    if market_key == "totals":
        if point is None:
            return None
        # We only care about 2.5 totals for now
        if abs(point - 2.5) < 1e-6:
            if outcome_name.lower() == "over":
                return ("OVER_UNDER_2_5", "over_2_5")
            if outcome_name.lower() == "under":
                return ("OVER_UNDER_2_5", "under_2_5")
        return None
    if market_key == "btts":
        if outcome_name.lower() in ("yes", "btts yes", "both teams to score yes"):
            return ("BTTS", "btts_yes")
        if outcome_name.lower() in ("no", "btts no", "both teams to score no"):
            return ("BTTS", "btts_no")
        return None
    return None


def parse_odds_payload(payload: list) -> List[dict]:
    """Each element of `payload` is one match. Return a list of records:

        {
          fixture_api_id: int,        # our id (hashed from date+home+away)
          home: str, away: str,
          kickoff_iso: str,
          quotes: List[MarketQuote],
        }
    """
    out: List[dict] = []
    for entry in payload or []:
        try:
            home = entry["home_team"]
            away = entry["away_team"]
            commence_iso = entry.get("commence_time")
            kickoff = datetime.fromisoformat(commence_iso.replace("Z", "+00:00"))
            day = kickoff.date().isoformat()
            quotes: List[MarketQuote] = []
            for bk in entry.get("bookmakers") or []:
                bk_name = bk.get("title") or bk.get("key", "?")
                for mk in bk.get("markets") or []:
                    market_key = mk.get("key")
                    for oc in mk.get("outcomes") or []:
                        mo = _to_market_outcome(
                            market_key,
                            oc.get("name", ""),
                            oc.get("point"),
                            home,
                            away,
                        )
                        if mo is None:
                            continue
                        try:
                            odds = float(oc["price"])
                        except (KeyError, ValueError, TypeError):
                            continue
                        quotes.append(
                            MarketQuote(
                                market=mo[0],
                                outcome=mo[1],
                                bookmaker=bk_name,
                                decimal_odds=odds,
                            )
                        )
            out.append(
                {
                    "fixture_api_id": fixture_id(day, home, away),
                    "home": home,
                    "away": away,
                    "home_team_api_id": team_id(home),
                    "away_team_api_id": team_id(away),
                    # Coarse IDs used for cross-source matching with fixtures
                    # that came from football-data (different name spelling).
                    "home_team_canon_id": canonical_team_id(home),
                    "away_team_canon_id": canonical_team_id(away),
                    "kickoff_date": day,
                    "kickoff_iso": kickoff.isoformat(),
                    "quotes": quotes,
                }
            )
        except (KeyError, ValueError, TypeError):
            logger.exception("Skipping malformed odds entry")
            continue
    return out


class OddsApiCollector:
    def __init__(self, client: RateLimitedClient, api_key: str) -> None:
        if not api_key:
            raise ValueError("ODDS_API_KEY is required")
        self.client = client
        self.api_key = api_key

    def _url(self, sport_key: str) -> str:
        return f"{BASE_URL}/sports/{sport_key}/odds"

    async def fetch_competition(self, code: str) -> List[dict]:
        sport_key = SPORT_KEYS.get(code)
        if not sport_key:
            return []
        url = self._url(sport_key)
        # Try the rich market list first; if the plan doesn't include some
        # of them The Odds API returns 422 — we then retry with the basics.
        for markets in ("h2h,totals,btts,spreads,double_chance", "h2h,totals,btts", "h2h,totals"):
            logger.info("Odds API fetching %s (%s) markets=%s", code, sport_key, markets)
            try:
                response = await self.client.get(
                    url,
                    params={
                        "apiKey": self.api_key,
                        "regions": "eu,uk",
                        "markets": markets,
                        "oddsFormat": "decimal",
                        "dateFormat": "iso",
                    },
                    headers={"Accept": "application/json"},
                )
                if response.status_code == 422:
                    logger.warning(
                        "Odds API rejected markets=%s for %s; retrying with simpler set",
                        markets,
                        sport_key,
                    )
                    continue
                response.raise_for_status()
                payload = response.json()
                records = parse_odds_payload(payload)
                logger.info(
                    "Odds API %s: %d matches with quotes (markets=%s)",
                    code,
                    len(records),
                    markets,
                )
                return records
            except Exception:
                logger.exception("Odds API fetch failed for %s with markets=%s", code, markets)
                continue
        return []

    async def fetch_all(self) -> List[dict]:
        out: List[dict] = []
        for code in SPORT_KEYS:
            out.extend(await self.fetch_competition(code))
        return out

    async def list_active_sports(self) -> List[dict]:
        """GET /v4/sports — returns every currently in-season sport.

        We use this to dynamically discover active tennis tournaments
        without hard-coding their changing keys.
        """
        url = f"{BASE_URL}/sports"
        try:
            response = await self.client.get(
                url,
                params={"apiKey": self.api_key, "all": "false"},
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            return response.json() or []
        except Exception:
            logger.exception("Odds API list_active_sports failed")
            return []

    async def fetch_tennis(self) -> List[dict]:
        """Fetch h2h odds for every currently active ATP/WTA tournament.

        Returns one dict per match with player names + a list of MarketQuote
        objects (one per bookmaker). The market type is always 'H2H' and
        outcomes are 'player1_win' / 'player2_win'.
        """
        sports = await self.list_active_sports()
        tennis_keys = [
            s["key"]
            for s in sports
            if isinstance(s, dict)
            and s.get("group") == "Tennis"
            and (s.get("active") is None or s.get("active"))
        ]
        if not tennis_keys:
            logger.info("Odds API: no active tennis tournaments right now")
            return []
        logger.info("Odds API tennis active keys: %s", tennis_keys)

        records: List[dict] = []
        for key in tennis_keys:
            url = self._url(key)
            logger.info("Odds API fetching tennis %s", key)
            try:
                response = await self.client.get(
                    url,
                    params={
                        "apiKey": self.api_key,
                        "regions": "eu,uk",
                        "markets": "h2h",
                        "oddsFormat": "decimal",
                        "dateFormat": "iso",
                    },
                    headers={"Accept": "application/json"},
                )
                response.raise_for_status()
                payload = response.json()
            except Exception:
                logger.exception("Odds API tennis fetch failed for %s", key)
                continue
            records.extend(_parse_tennis_payload(payload, key))
        logger.info("Odds API tennis: %d matches with quotes", len(records))
        return records


def _parse_tennis_payload(payload: list, sport_key: str) -> List[dict]:
    out: List[dict] = []
    for entry in payload or []:
        try:
            p1 = entry["home_team"]
            p2 = entry["away_team"]
            commence = entry.get("commence_time", "")
            kickoff = datetime.fromisoformat(commence.replace("Z", "+00:00"))
            quotes: List[MarketQuote] = []
            for bk in entry.get("bookmakers") or []:
                bk_name = bk.get("title") or bk.get("key", "?")
                for mk in bk.get("markets") or []:
                    if mk.get("key") != "h2h":
                        continue
                    for oc in mk.get("outcomes") or []:
                        name = oc.get("name", "")
                        try:
                            odds = float(oc["price"])
                        except (KeyError, ValueError, TypeError):
                            continue
                        if name == p1:
                            outcome = "player1_win"
                        elif name == p2:
                            outcome = "player2_win"
                        else:
                            continue
                        quotes.append(
                            MarketQuote(
                                market="H2H",
                                outcome=outcome,
                                bookmaker=bk_name,
                                decimal_odds=odds,
                            )
                        )
            out.append(
                {
                    "sport_key": sport_key,
                    "kickoff_iso": kickoff.isoformat(),
                    "kickoff_date": kickoff.date().isoformat(),
                    "player1_name": p1,
                    "player2_name": p2,
                    "quotes": quotes,
                }
            )
        except (KeyError, ValueError, TypeError):
            logger.exception("Skipping malformed tennis odds entry")
            continue
    return out
