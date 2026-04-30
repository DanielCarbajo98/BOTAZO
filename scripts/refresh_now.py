"""Manual one-shot data refresh.

Usage (locally with .env loaded or with env vars exported):

    PYTHONPATH=. python scripts/refresh_now.py
"""
from __future__ import annotations

import asyncio
import sys

from src.config import Config, setup_logging
from src.jobs.data_refresh import refresh_all


async def main() -> int:
    config = Config.from_env()
    setup_logging(config.log_level)
    config.require()
    fixtures, stats, teams = await refresh_all()
    print(f"fixtures upserted: {fixtures}")
    print(f"fixture_stats upserted: {stats}")
    print(f"teams upserted: {teams}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
