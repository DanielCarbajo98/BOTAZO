"""Supabase client wrapper. Lazily instantiated to avoid hard failures on import."""
from __future__ import annotations

import logging
from typing import Optional

from supabase import Client, create_client

from src.config import Config

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def get_client(config: Optional[Config] = None) -> Client:
    global _client
    if _client is not None:
        return _client

    cfg = config or Config.from_env()
    if not cfg.supabase_url or not cfg.supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")

    logger.info("Initializing Supabase client")
    _client = create_client(cfg.supabase_url, cfg.supabase_key)
    return _client


def reset_client() -> None:
    """Used in tests to clear the cached client."""
    global _client
    _client = None
