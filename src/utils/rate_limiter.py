"""Per-domain async rate limiter.

Guarantees a minimum interval between consecutive requests to the same host.
Used by collectors to respect FBref/Understat scraping etiquette (>= 3s).
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from typing import Dict
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class DomainRateLimiter:
    def __init__(self, min_interval_seconds: float = 3.0) -> None:
        if min_interval_seconds < 0:
            raise ValueError("min_interval_seconds must be non-negative")
        self.min_interval = min_interval_seconds
        self._locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self._last_call: Dict[str, float] = defaultdict(float)

    @staticmethod
    def _domain(url: str) -> str:
        parsed = urlparse(url)
        return parsed.netloc.lower() or url

    async def wait(self, url: str) -> None:
        domain = self._domain(url)
        lock = self._locks[domain]
        async with lock:
            now = time.monotonic()
            elapsed = now - self._last_call[domain]
            if elapsed < self.min_interval:
                delay = self.min_interval - elapsed
                logger.debug("Rate-limit %s: sleeping %.2fs", domain, delay)
                await asyncio.sleep(delay)
            self._last_call[domain] = time.monotonic()
