"""Telegram bot — handlers and application factory."""
from __future__ import annotations

import logging
from datetime import datetime

import pytz
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
)

from src.bot import formatters
from src.config import Config
from src.storage.repository import fixtures_on_date

logger = logging.getLogger(__name__)


async def start(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    logger.info("/start from user_id=%s username=%s", user.id if user else "?", user.username if user else "?")
    await update.message.reply_text(
        formatters.welcome_message(), parse_mode=ParseMode.MARKDOWN
    )


async def help_command(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/help from chat_id=%s", update.effective_chat.id)
    await update.message.reply_text(
        formatters.help_message(), parse_mode=ParseMode.MARKDOWN
    )


async def hoy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/hoy from chat_id=%s", update.effective_chat.id)
    config: Config = context.application.bot_data.get("config")
    tz_name = config.timezone if config else "Europe/Madrid"
    try:
        today_local = datetime.now(pytz.timezone(tz_name)).date()
        rows = fixtures_on_date(today_local)
        text = formatters.fixtures_today(rows)
    except Exception:
        logger.exception("Error fetching fixtures for /hoy")
        text = (
            "No he podido leer los partidos de hoy. "
            "Mira los logs del worker para ver el detalle."
        )
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def stats(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/stats from chat_id=%s", update.effective_chat.id)
    await update.message.reply_text(
        formatters.stats_placeholder(), parse_mode=ParseMode.MARKDOWN
    )


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.exception("Unhandled error while processing update", exc_info=context.error)


def build_application(config: Config) -> Application:
    app = ApplicationBuilder().token(config.telegram_bot_token).build()
    app.bot_data["config"] = config
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("hoy", hoy))
    app.add_handler(CommandHandler("stats", stats))
    app.add_error_handler(on_error)
    return app
