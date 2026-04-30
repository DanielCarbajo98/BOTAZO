import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.config import Config
from src.main import schedule_jobs


def test_schedule_jobs_registers_daily_report():
    config = Config(
        telegram_bot_token="x",
        telegram_chat_id="y",
        supabase_url="https://example.supabase.co",
        supabase_key="k",
        timezone="Europe/Madrid",
        daily_report_hour=9,
        daily_report_minute=0,
        log_level="INFO",
        football_data_api_key="",
    )
    scheduler = AsyncIOScheduler(timezone=pytz.timezone(config.timezone))
    schedule_jobs(scheduler, config)
    job = scheduler.get_job("daily_report")
    assert job is not None
    assert "hour='9'" in str(job.trigger)
    assert "minute='0'" in str(job.trigger)
