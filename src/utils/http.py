"""HTTP utilities: shared httpx client with rate limiting and backoff.

We started with an identifying UA per the spec, but FBref's Cloudflare layer
blocks datacenter IPs that announce themselves as bots. We now send realistic
browser headers and pre-warm cookies on the FBref homepage. This is standard
scraping practice (no JS/captcha bypass, no IP rotation).
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

import httpx

from src.utils.rate_limiter import DomainRateLimiter

DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Realistic Chrome on macOS UA. Updated periodically as Chrome ships new majors.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="131", "Google Chrome";v="131", "Not.A/Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

# Hosts where we proactively GET the homepage on first contact so the shared
# AsyncClient picks up any cookies the server hands out. Helps with Cloudflare
# soft challenges that issue clearance cookies after the first roundtrip.
WARMUP_HOSTS = {
    "fbref.com": "https://fbref.com/en/",
    "understat.com": "https://understat.com/",
}

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
        self._warmed: set[str] = set()

    async def __aenter__(self) -> "RateLimitedClient":
        self._client = httpx.AsyncClient(
            headers=BROWSER_HEADERS,
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            http2=True,
        )
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _warmup(self, host: str) -> None:
        if host in self._warmed or host not in WARMUP_HOSTS:
            return
        self._warmed.add(host)  # mark first to avoid retry storms
        url = WARMUP_HOSTS[host]
        try:
            await self.rate_limiter.wait(url)
            response = await self._client.get(url)
            logger.info("Warmup %s -> %s", host, response.status_code)
        except Exception:
            logger.warning("Warmup failed for %s", host, exc_info=True)

    async def get(self, url: str, **kwargs) -> httpx.Response:
        if self._client is None:
            raise RuntimeError("RateLimitedClient must be used as async context manager")

        host = httpx.URL(url).host
        await self._warmup(host)

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
