"""HTTP utilities: shared httpx client with rate limiting and backoff.

All collectors share one async client so the rate limiter sees every request
to a given domain. Default UA identifies us as the spec requires.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

import httpx

from src.utils.rate_limiter import DomainRateLimiter

USER_AGENT = "Audiobet/1.0 (contact: daniel@audiobus.com)"
DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

logger = logging.getLogger(__name__)


class RateLimitedClient:
    """Wraps httpx.AsyncClient with per-domain throttling and 429 backoff."""

    def __init__(
        self,
        rate_limiter: Optional[DomainRateLimiter] = None,
        max_retries: int = 4,
        initial_backoff_seconds: float = 60.0,
    ) -> None:
        self.rate_limiter = rate_limiter or DomainRateLimiter(min_interval_seconds=3.0)
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff_seconds
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "RateLimitedClient":
        self._client = httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT, "Accept-Language": "en;q=0.9"},
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            http2=True,
        )
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def get(self, url: str, **kwargs) -> httpx.Response:
        if self._client is None:
            raise RuntimeError("RateLimitedClient must be used as async context manager")

        backoff = self.initial_backoff
        last_exc: Optional[Exception] = None
        for attempt in range(self.max_retries + 1):
            await self.rate_limiter.wait(url)
            try:
                response = await self._client.get(url, **kwargs)
            except (httpx.RequestError, httpx.HTTPError) as e:
                last_exc = e
                logger.warning("HTTP error on %s (attempt %d): %s", url, attempt + 1, e)
                if attempt >= self.max_retries:
                    raise
                await asyncio.sleep(min(backoff, 30.0))
                backoff *= 2
                continue

            if response.status_code == 429:
                logger.warning(
                    "Got 429 on %s, backing off %.0fs (attempt %d)",
                    url,
                    backoff,
                    attempt + 1,
                )
                if attempt >= self.max_retries:
                    response.raise_for_status()
                await asyncio.sleep(backoff)
                backoff *= 2
                continue

            if 500 <= response.status_code < 600:
                logger.warning(
                    "Server error %d on %s (attempt %d)",
                    response.status_code,
                    url,
                    attempt + 1,
                )
                if attempt >= self.max_retries:
                    response.raise_for_status()
                await asyncio.sleep(min(backoff, 30.0))
                backoff *= 2
                continue

            return response

        if last_exc:
            raise last_exc
        raise RuntimeError(f"Failed to fetch {url}")
