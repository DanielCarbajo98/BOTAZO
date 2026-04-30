import os

import pytest

from src.config import Config


def test_config_defaults(monkeypatch):
    for var in (
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_CHAT_ID",
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "TIMEZONE",
        "DAILY_REPORT_HOUR",
        "DAILY_REPORT_MINUTE",
        "LOG_LEVEL",
    ):
        monkeypatch.delenv(var, raising=False)

    cfg = Config.from_env()
    assert cfg.timezone == "Europe/Madrid"
    assert cfg.daily_report_hour == 9
    assert cfg.daily_report_minute == 0
    assert cfg.log_level == "INFO"


def test_config_require_raises_when_missing(monkeypatch):
    for var in (
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_CHAT_ID",
        "SUPABASE_URL",
        "SUPABASE_KEY",
    ):
        monkeypatch.delenv(var, raising=False)

    cfg = Config.from_env()
    with pytest.raises(RuntimeError) as exc:
        cfg.require()
    assert "TELEGRAM_BOT_TOKEN" in str(exc.value)


def test_config_require_passes_when_set(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "x")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "y")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "k")
    cfg = Config.from_env()
    cfg.require()
