"""Telegram bot — handlers and application factory."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

import pytz
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
)

from src.analyzer.daily_report import build_daily_report
from src.analyzer.predictions import predictions_for_fixtures
from src.analyzer.stats import compute_stats
from src.analyzer.tennis_predictions import get_tennis_rater, predict_match as predict_tennis_match
from src.bot import formatters
from src.collectors.odds_api import OddsApiCollector
from src.collectors.tennis_sackmann import player_api_id as tennis_player_api_id
from src.config import Config
from src.storage.repository import fixtures_on_date
from src.utils.http import RateLimitedClient
from src.utils.rate_limiter import DomainRateLimiter

logger = logging.getLogger(__name__)


async def start(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    logger.info("/start from user_id=%s username=%s", user.id if user else "?", user.username if user else "?")
    await update.message.reply_text(
        formatters.welcome_message(), parse_mode=ParseMode.HTML
    )


async def help_command(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/help from chat_id=%s", update.effective_chat.id)
    await update.message.reply_text(
        formatters.help_message(), parse_mode=ParseMode.HTML
    )


async def _show_fixtures_for_offset(
    update: Update, context: ContextTypes.DEFAULT_TYPE, days_offset: int
) -> None:
    config: Config = context.application.bot_data.get("config")
    tz_name = config.timezone if config else "Europe/Madrid"
    await update.message.reply_text(
        "Calculando predicciones, dame unos segundos…"
    )
    try:
        target = (datetime.now(pytz.timezone(tz_name)) + timedelta(days=days_offset)).date()
        label = target.strftime("%d/%m/%Y")
        rows = fixtures_on_date(target)
        if not rows:
            text = (
                f"*Partidos del {label}*\n\n"
                "No hay partidos en las ligas seguidas ese día."
            )
        else:
            items = predictions_for_fixtures(rows)
            text = formatters.fixtures_today_with_predictions(items, title_date=label)
    except Exception:
        logger.exception("Error fetching fixtures for offset=%d", days_offset)
        text = (
            "No he podido leer los partidos. "
            "Mira los logs del worker para ver el detalle."
        )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def hoy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/hoy from chat_id=%s", update.effective_chat.id)
    await _show_fixtures_for_offset(update, context, days_offset=0)


async def manana(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/manana from chat_id=%s", update.effective_chat.id)
    await _show_fixtures_for_offset(update, context, days_offset=1)


async def partidos(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/partidos N — partidos dentro de N días (0 = hoy, 1 = mañana, ...)."""
    logger.info("/partidos %s from chat_id=%s", context.args, update.effective_chat.id)
    offset = 0
    if context.args:
        try:
            offset = int(context.args[0])
        except ValueError:
            await update.message.reply_text(
                "Uso: /partidos N (donde N es 0=hoy, 1=mañana, 2=pasado, etc.)"
            )
            return
    if not (-7 <= offset <= 14):
        await update.message.reply_text("Solo acepto rango -7 ≤ N ≤ 14.")
        return
    await _show_fixtures_for_offset(update, context, days_offset=offset)


async def tenis(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List today's tennis matches with model probabilities. No odds yet."""
    logger.info("/tenis from chat_id=%s", update.effective_chat.id)
    config: Config = context.application.bot_data.get("config")
    if not config or not config.odds_api_key:
        await update.message.reply_text(
            "Tenis no está disponible: falta ODDS_API_KEY.",
            parse_mode=ParseMode.HTML,
        )
        return
    await update.message.reply_text("Consultando torneos activos…")

    try:
        rate_limiter = DomainRateLimiter(min_interval_seconds=3.0)
        async with RateLimitedClient(rate_limiter=rate_limiter) as client:
            odds = OddsApiCollector(client=client, api_key=config.odds_api_key)
            records = await odds.fetch_tennis()

        if not records:
            await update.message.reply_text(
                "No hay torneos de tenis activos ahora mismo.",
                parse_mode=ParseMode.HTML,
            )
            return

        rater = get_tennis_rater()
        lines = ["🎾 <b>Tenis — predicciones</b>", ""]
        for rec in records[:25]:
            p1 = rec.get("player1_name", "?")
            p2 = rec.get("player2_name", "?")
            kickoff = rec.get("kickoff_iso", "")
            try:
                ko = datetime.fromisoformat(kickoff).strftime("%d/%m %H:%M")
            except Exception:
                ko = "--"
            atp_p1 = rater.get(tennis_player_api_id("ATP", p1)).matches
            wta_p1 = rater.get(tennis_player_api_id("WTA", p1)).matches
            tour = "ATP" if atp_p1 >= wta_p1 else "WTA"
            pred = predict_tennis_match(tour, p1, p2, surface=None, rater=rater)
            lines.append(
                f"🕘 <b>{ko}</b> · {p1} vs {p2}  <i>({tour})</i>"
            )
            lines.append(
                f"   {p1}: <b>{pred['player1_win']*100:.0f}%</b>  ·  "
                f"{p2}: <b>{pred['player2_win']*100:.0f}%</b>"
            )
            lines.append("")

        await update.message.reply_text(
            "\n".join(lines).strip(), parse_mode=ParseMode.HTML
        )
    except Exception:
        logger.exception("/tenis failed")
        await update.message.reply_text(
            "Error consultando tenis. Mira los logs."
        )


async def stats(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("/stats from chat_id=%s", update.effective_chat.id)
    try:
        summary = compute_stats()
        text = formatters.stats_summary(summary)
    except Exception:
        logger.exception("/stats failed")
        text = (
            "No he podido calcular las estadísticas. "
            "Mira los logs del worker para ver el detalle."
        )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def informe(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/informe [N] — informe del día. N=0 hoy, N=1 mañana, N=-1 ayer, etc."""
    logger.info("/informe %s from chat_id=%s", context.args, update.effective_chat.id)
    config: Config = context.application.bot_data.get("config")

    offset = 0
    if context.args:
        try:
            offset = int(context.args[0])
        except ValueError:
            await update.message.reply_text(
                "Uso: /informe N (donde N es 0=hoy, 1=mañana, 2=pasado, …)"
            )
            return
    if not (-7 <= offset <= 14):
        await update.message.reply_text("Solo acepto rango -7 ≤ N ≤ 14.")
        return

    label = {0: "hoy", 1: "mañana", -1: "ayer"}.get(offset, f"+{offset} días" if offset > 0 else f"{offset} días")
    await update.message.reply_text(
        f"Generando informe de {label} (10-30s si tengo que pedir cuotas)…"
    )
    try:
        text = await build_daily_report(config, days_offset=offset)
        await update.message.reply_text(text, parse_mode=ParseMode.HTML, disable_web_page_preview=True)
    except Exception:
        logger.exception("/informe failed")
        await update.message.reply_text(
            "El informe falló. Mira los logs del worker."
        )


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.exception("Unhandled error while processing update", exc_info=context.error)


def build_application(config: Config) -> Application:
    app = ApplicationBuilder().token(config.telegram_bot_token).build()
    app.bot_data["config"] = config
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("hoy", hoy))
    app.add_handler(CommandHandler("manana", manana))
    app.add_handler(CommandHandler("partidos", partidos))
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(CommandHandler("informe", informe))
    app.add_handler(CommandHandler("tenis", tenis))
    app.add_error_handler(on_error)
    return app
