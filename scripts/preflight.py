"""One-shot preflight check: verifies Telegram and Supabase credentials."""
from __future__ import annotations

import asyncio
import sys

from telegram import Bot
from telegram.error import TelegramError

from src.config import Config, setup_logging
from src.storage.supabase_client import get_client


async def check_telegram(config: Config) -> bool:
    bot = Bot(token=config.telegram_bot_token)
    try:
        me = await bot.get_me()
        print(f"[Telegram] getMe OK -> @{me.username} (id={me.id})")
    except TelegramError as e:
        print(f"[Telegram] getMe FAILED: {e}")
        return False

    try:
        chat = await bot.get_chat(chat_id=config.telegram_chat_id)
        print(f"[Telegram] getChat OK -> type={chat.type} title={chat.title!r}")
    except TelegramError as e:
        print(f"[Telegram] getChat FAILED for chat_id={config.telegram_chat_id}: {e}")
        return False

    try:
        msg = await bot.send_message(
            chat_id=config.telegram_chat_id,
            text="Audiobet preflight: conexion verificada.",
        )
        print(f"[Telegram] send_message OK -> message_id={msg.message_id}")
    except TelegramError as e:
        print(f"[Telegram] send_message FAILED: {e}")
        print("        -> If channel: add the bot as admin with 'Post messages' permission.")
        return False

    return True


def check_supabase(config: Config) -> bool:
    try:
        client = get_client(config)
    except Exception as e:
        print(f"[Supabase] client init FAILED: {e}")
        return False

    for table in ("teams", "fixtures", "predictions"):
        try:
            res = client.table(table).select("*", count="exact").limit(1).execute()
            count = getattr(res, "count", None)
            print(f"[Supabase] table {table!r} reachable (rows={count})")
        except Exception as e:
            print(f"[Supabase] query on {table!r} FAILED: {e}")
            return False
    return True


async def main() -> int:
    config = Config.from_env()
    setup_logging("INFO")
    try:
        config.require()
    except RuntimeError as e:
        print(f"[Config] {e}")
        return 1

    tg_ok = await check_telegram(config)
    sb_ok = check_supabase(config)

    print()
    print(f"Telegram: {'OK' if tg_ok else 'FAIL'}")
    print(f"Supabase: {'OK' if sb_ok else 'FAIL'}")
    return 0 if (tg_ok and sb_ok) else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
