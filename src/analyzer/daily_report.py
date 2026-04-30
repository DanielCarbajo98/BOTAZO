"""Daily report job. Phase 1 stub — sends a placeholder message at the scheduled time."""
from __future__ import annotations

import logging
from datetime import datetime

from telegram import Bot
from telegram.constants import ParseMode

from src.bot import formatters
from src.config import Config

logger = logging.getLogger(__name__)


async def send_daily_report(config: Config) -> None:
    report_date = datetime.now().strftime("%d/%m/%Y")
    logger.info("Sending daily report for %s", report_date)
    bot = Bot(token=config.telegram_bot_token)
    try:
        await bot.send_message(
            chat_id=config.telegram_chat_id,
            text=formatters.daily_report_placeholder(report_date),
            parse_mode=ParseMode.MARKDOWN,
        )
        logger.info("Daily report sent to chat_id=%s", config.telegram_chat_id)
    except Exception:
        logger.exception("Failed to send daily report")
        raise
