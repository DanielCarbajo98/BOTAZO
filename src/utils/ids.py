"""Deterministic integer IDs for upserts.

The existing Supabase schema uses `api_id integer` for teams and fixtures, but
our sources (football-data, FBref, Understat, The Odds API) expose string
identifiers that don't always agree on capitalisation, suffixes ("CF", "FC")
or punctuation. We hash them into stable 31-bit positive integers so the
same entity always maps to the same id within a source.

For *cross-source* matching (football-data vs The Odds API for the same
match), we ALSO expose a coarser canonical_team_id() that strips the most
common club suffix/prefix noise so "Real Madrid CF" and "Real Madrid"
collapse to the same hash. Use it only for join-time lookups, never for
primary keys.
"""
from __future__ import annotations

import hashlib
import re
import unicodedata


_WHITESPACE = re.compile(r"\s+")

# Common club name suffixes/prefixes seen across European football sources.
_SUFFIXES = (
    " fc", " cf", " afc", " ac", " sc", " sk", " bk", " bsc", " ssc",
    " 04", " 05", " 09", " 96", " 1893", " 1900", " 1909", " 1913",
    " hsv", " vfb", " vfl", " borussia", " club",
)
_PREFIXES = ("fc ", "ac ", "as ", "ss ", "ssc ", "rcd ", "rc ", "cd ", "cf ", "ud ")


def _normalize(value: str) -> str:
    nfkd = unicodedata.normalize("NFKD", value)
    stripped = "".join(c for c in nfkd if not unicodedata.combining(c))
    return _WHITESPACE.sub(" ", stripped).strip().lower()


def _canonicalize_team_name(name: str) -> str:
    """Coarse normalisation: strip diacritics, collapse whitespace, drop
    common club suffixes/prefixes, drop trailing parenthetical content."""
    s = _normalize(name)
    if not s:
        return s
    if "(" in s:
        s = s.split("(", 1)[0].strip()
    # Repeatedly strip suffixes (some teams have stacked tokens like "FC")
    changed = True
    while changed:
        changed = False
        for suf in _SUFFIXES:
            if s.endswith(suf):
                s = s[: -len(suf)].strip()
                changed = True
        for pre in _PREFIXES:
            if s.startswith(pre):
                s = s[len(pre):].strip()
                changed = True
    return s.strip()


def stable_int_id(*parts: str) -> int:
    """Hash one or more strings into a deterministic positive 31-bit int."""
    if not parts:
        raise ValueError("stable_int_id requires at least one part")
    payload = "|".join(_normalize(p) for p in parts)
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) & 0x7FFFFFFF


def team_id(name: str) -> int:
    """Strict per-source team id (uses raw normalised name)."""
    return stable_int_id("team", name)


def canonical_team_id(name: str) -> int:
    """Coarser team id used for cross-source joins (e.g. matching odds
    records against football-data fixtures). NEVER use as a primary key
    because different teams could collide more easily than with team_id().
    """
    return stable_int_id("team_canon", _canonicalize_team_name(name))


def fixture_id(date_iso: str, home: str, away: str) -> int:
    return stable_int_id("fixture", date_iso, home, away)

