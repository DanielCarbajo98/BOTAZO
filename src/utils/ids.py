"""Deterministic integer IDs for upserts.

The existing Supabase schema uses `api_id integer` for teams and fixtures, but
our sources (FBref, Understat) expose string identifiers. We hash them into
stable 31-bit positive integers so the same entity always maps to the same id.
"""
from __future__ import annotations

import hashlib
import re
import unicodedata


_WHITESPACE = re.compile(r"\s+")


def _normalize(value: str) -> str:
    nfkd = unicodedata.normalize("NFKD", value)
    stripped = "".join(c for c in nfkd if not unicodedata.combining(c))
    return _WHITESPACE.sub(" ", stripped).strip().lower()


def stable_int_id(*parts: str) -> int:
    """Hash one or more strings into a deterministic positive 31-bit int."""
    if not parts:
        raise ValueError("stable_int_id requires at least one part")
    payload = "|".join(_normalize(p) for p in parts)
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) & 0x7FFFFFFF


def team_id(name: str) -> int:
    return stable_int_id("team", name)


def fixture_id(date_iso: str, home: str, away: str) -> int:
    return stable_int_id("fixture", date_iso, home, away)
