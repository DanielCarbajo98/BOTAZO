"""Centralized configuration loaded from environment variables."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    telegram_bot_token: str
    telegram_chat_id: str
    supabase_url: str
    supabase_key: str
    timezone: str
    daily_report_hour: int
    daily_report_minute: int
    log_level: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            telegram_bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", ""),
            telegram_chat_id=os.environ.get("TELEGRAM_CHAT_ID", ""),
            supabase_url=os.environ.get("SUPABASE_URL", ""),
            supabase_key=os.environ.get("SUPABASE_KEY", ""),
            timezone=os.environ.get("TIMEZONE", "Europe/Madrid"),
            daily_report_hour=int(os.environ.get("DAILY_REPORT_HOUR", "9")),
            daily_report_minute=int(os.environ.get("DAILY_REPORT_MINUTE", "0")),
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
        )

    def require(self) -> None:
        missing = [
            name
            for name, value in {
                "TELEGRAM_BOT_TOKEN": self.telegram_bot_token,
                "TELEGRAM_CHAT_ID": self.telegram_chat_id,
                "SUPABASE_URL": self.supabase_url,
                "SUPABASE_KEY": self.supabase_key,
            }.items()
            if not value
        ]
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}"
            )


def setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # httpx INFO logs the full URL of every request, which leaks the bot token
    # on every Telegram poll. Keep its WARN+ output only.
    for noisy in ("httpx", "httpcore", "hpack"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
