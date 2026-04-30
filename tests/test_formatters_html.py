"""Smoke tests for the HTML-based formatters: ensure they produce valid
text, escape user-controlled values, and contain the headline data."""
from src.bot.formatters import (
    daily_report,
    fixtures_today_with_predictions,
    stats_summary,
)


class _DummyPred:
    def __init__(self):
        self.probabilities = {
            "home_win": 0.55,
            "draw": 0.25,
            "away_win": 0.20,
            "over_2_5": 0.60,
            "under_2_5": 0.40,
            "btts_yes": 0.55,
            "btts_no": 0.45,
        }
        self.lambda_home = 1.7
        self.lambda_away = 1.1


def test_fixtures_with_predictions_contains_team_names_and_pcts():
    items = [
        {
            "fixture": {
                "date": "2026-04-30T21:00:00",
                "league_name": "La Liga",
                "home_team_name": "Real Madrid",
                "away_team_name": "Barcelona",
                "score_home": None,
                "score_away": None,
            },
            "prediction": _DummyPred(),
        }
    ]
    text = fixtures_today_with_predictions(items, title_date="30/04/2026")
    assert "Real Madrid" in text
    assert "Barcelona" in text
    assert "55%" in text
    assert "21:00" in text
    assert "<b>" in text  # HTML formatting


def test_daily_report_with_value_picks():
    pick = {
        "match_label": "Real Madrid vs Barcelona",
        "market": "1X2",
        "outcome": "home_win",
        "market_odds": 1.95,
        "model_probability": 0.60,
        "implied_probability": 0.513,
        "edge": 0.087,
        "expected_value": 0.17,
        "recommended_stake_pct": 0.02,
        "confidence": "media",
        "bookmaker": "Pinnacle",
    }
    items = [
        {
            "fixture": {
                "date": "2026-04-30T21:00:00",
                "league_name": "La Liga",
                "home_team_name": "Real Madrid",
                "away_team_name": "Barcelona",
            },
            "prediction": _DummyPred(),
        }
    ]
    text = daily_report("30/04/2026", items, [pick])
    assert "Real Madrid vs Barcelona" in text
    assert "Local (1)" in text
    assert "1.95" in text
    assert "Edge" in text
    assert "Pinnacle" in text


def test_daily_report_no_picks_message():
    text = daily_report("30/04/2026", [], [])
    assert "SIN VALOR" in text or "MEJOR PASAR" in text
    assert "Audiobet" in text


def test_stats_summary_with_data():
    summary = {
        "total_resolved": 50,
        "won": 22,
        "lost": 25,
        "void": 3,
        "hit_rate": 22 / 47,
        "pnl_units": 4.50,
        "stake_units": 100.0,
        "roi": 0.045,
        "max_drawdown_units": 6.20,
        "by_league": [
            {"league": "La Liga", "won": 8, "lost": 6, "void": 0, "total": 14, "pnl": 3.10, "hit_rate": 0.57}
        ],
        "by_market": [
            {"market": "1X2", "won": 12, "lost": 14, "void": 0, "total": 26, "pnl": 1.20, "hit_rate": 0.46}
        ],
    }
    text = stats_summary(summary)
    assert "50" in text
    assert "ROI" in text
    assert "Drawdown" in text
    assert "La Liga" in text


def test_stats_summary_empty_falls_back_to_placeholder():
    text = stats_summary({"total_resolved": 0})
    assert "picks resueltas" in text or "Estadísticas" in text


def test_html_escaping_protects_against_injected_chars():
    items = [
        {
            "fixture": {
                "date": "2026-04-30T21:00:00",
                "league_name": "Liga <script>",
                "home_team_name": "Team & Co",
                "away_team_name": "X",
            },
            "prediction": _DummyPred(),
        }
    ]
    text = fixtures_today_with_predictions(items, title_date="30/04/2026")
    assert "<script>" not in text
    assert "&lt;script&gt;" in text
    assert "&amp;" in text
