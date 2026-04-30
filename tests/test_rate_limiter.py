import asyncio
import time

import pytest

from src.utils.rate_limiter import DomainRateLimiter


@pytest.mark.asyncio
async def test_rate_limiter_enforces_min_interval():
    limiter = DomainRateLimiter(min_interval_seconds=0.2)
    start = time.monotonic()
    await limiter.wait("https://fbref.com/a")
    await limiter.wait("https://fbref.com/b")
    await limiter.wait("https://fbref.com/c")
    elapsed = time.monotonic() - start
    # 3 sequential waits at 0.2s -> at least ~0.4s of total sleep
    assert elapsed >= 0.4


@pytest.mark.asyncio
async def test_rate_limiter_isolates_domains():
    limiter = DomainRateLimiter(min_interval_seconds=0.5)
    start = time.monotonic()
    await limiter.wait("https://fbref.com/a")
    await limiter.wait("https://understat.com/a")
    elapsed = time.monotonic() - start
    # Both should fire near-instantly because they hit different domains
    assert elapsed < 0.3


@pytest.mark.asyncio
async def test_rate_limiter_concurrent_serialised():
    limiter = DomainRateLimiter(min_interval_seconds=0.2)

    async def hit():
        await limiter.wait("https://fbref.com/x")

    start = time.monotonic()
    await asyncio.gather(hit(), hit(), hit())
    elapsed = time.monotonic() - start
    # Three concurrent calls to same domain serialise -> ~0.4s minimum
    assert elapsed >= 0.4
