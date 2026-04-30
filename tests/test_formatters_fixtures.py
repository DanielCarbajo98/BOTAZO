from src.bot.formatters import fixtures_today


def test_fixtures_today_empty():
    msg = fixtures_today([])
    assert "Partidos del" in msg
    assert "No hay partidos" in msg


def test_fixtures_today_groups_by_league():
    rows = [
        {
            "date": "2026-04-30T21:00:00",
            "league_name": "La Liga",
            "home_team_name": "Real Madrid",
            "away_team_name": "Barcelona",
            "score_home": 2,
            "score_away": 1,
        },
        {
            "date": "2026-04-30T18:30:00",
            "league_name": "Premier League",
            "home_team_name": "Arsenal",
            "away_team_name": "Chelsea",
            "score_home": None,
            "score_away": None,
        },
    ]
    msg = fixtures_today(rows)
    assert "La Liga" in msg
    assert "Premier League" in msg
    assert "Real Madrid 2-1 Barcelona" in msg
    assert "Arsenal vs Chelsea" in msg
    assert "21:00" in msg and "18:30" in msg
    # HTML formatting present
    assert "<b>" in msg
