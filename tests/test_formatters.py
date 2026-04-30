from src.bot import formatters


def test_welcome_message_mentions_commands():
    msg = formatters.welcome_message()
    assert "/hoy" in msg
    assert "/stats" in msg
    assert "/help" in msg


def test_help_message_contains_all_commands():
    msg = formatters.help_message()
    for cmd in ("/start", "/hoy", "/stats", "/help"):
        assert cmd in msg


def test_today_placeholder_has_date():
    msg = formatters.today_placeholder()
    assert "Informe" in msg
    assert "/" in msg  # date contains slashes


def test_stats_placeholder_mentions_metrics():
    msg = formatters.stats_placeholder()
    assert "ROI" in msg or "hit rate" in msg.lower()


def test_daily_report_placeholder_includes_date():
    msg = formatters.daily_report_placeholder("01/05/2026")
    assert "01/05/2026" in msg
