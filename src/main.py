"""Audiobet entry point.

Runs the Telegram bot in long-polling mode and an APScheduler instance that
fires the daily report at the configured local time.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.analyzer.daily_report import send_daily_report
from src.bot.telegram_bot import build_application
from src.config import Config, setup_logging
from src.jobs.data_refresh import refresh_all
from src.jobs.resolve_picks import resolve_picks

logger = logging.getLogger("audiobet")


def schedule_jobs(scheduler: AsyncIOScheduler, config: Config) -> None:
    tz = pytz.timezone(config.timezone)
    trigger = CronTrigger(
        hour=config.daily_report_hour,
        minute=config.daily_report_minute,
        timezone=tz,
    )
    scheduler.add_job(
        send_daily_report,
        trigger=trigger,
        kwargs={"config": config},
        id="daily_report",
        replace_existing=True,
        misfire_grace_time=600,
    )
    logger.info(
        "Scheduled daily_report at %02d:%02d %s",
        config.daily_report_hour,
        config.daily_report_minute,
        config.timezone,
    )

    refresh_trigger = CronTrigger(hour=2, minute=0, timezone=tz)
    scheduler.add_job(
        refresh_all,
        trigger=refresh_trigger,
        id="data_refresh",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    logger.info("Scheduled data_refresh at 02:00 %s", config.timezone)

    resolve_trigger = CronTrigger(hour=3, minute=0, timezone=tz)
    scheduler.add_job(
        resolve_picks,
        trigger=resolve_trigger,
        id="resolve_picks",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    logger.info("Scheduled resolve_picks at 03:00 %s", config.timezone)


async def run() -> None:
    config = Config.from_env()
    setup_logging(config.log_level)
    config.require()

    logger.info("Starting Audiobet")
    application = build_application(config)

    scheduler = AsyncIOScheduler(timezone=pytz.timezone(config.timezone))
    schedule_jobs(scheduler, config)

    await application.initialize()
    await application.start()
    scheduler.start()
    await application.updater.start_polling()

    # Kick off a one-shot refresh ~30s after boot so /hoy has data without
    # waiting until the next 02:00 cron tick. Non-blocking, errors are logged.
    scheduler.add_job(
        refresh_all,
        id="data_refresh_boot",
        replace_existing=True,
        next_run_time=datetime.now(pytz.timezone(config.timezone))
        + timedelta(seconds=30),
        misfire_grace_time=300,
    )
    logger.info("Scheduled one-shot data_refresh ~30s after boot")

    logger.info("Audiobet is up. Press Ctrl+C to stop.")
    try:
        # Block forever
        stop_event = asyncio.Event()
        await stop_event.wait()
    finally:
        logger.info("Shutting down")
        scheduler.shutdown(wait=False)
        await application.updater.stop()
        await application.stop()
        await application.shutdown()


def main() -> None:
    try:
        asyncio.run(run())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Stopped by user")


if __name__ == "__main__":
    main()
