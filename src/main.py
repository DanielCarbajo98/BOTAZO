"""Audiobet entry point.

Runs the Telegram bot in long-polling mode and an APScheduler instance that
fires the daily report at the configured local time.
"""
from __future__ import annotations

import asyncio
import logging

import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.analyzer.daily_report import send_daily_report
from src.bot.telegram_bot import build_application
from src.config import Config, setup_logging

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
        args=[config],
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
