from src.analyzer.match_context import HeadToHead, MatchContext, TeamForm
from src.analyzer.narrative import build_narrative


def _form(
    matches=10,
    last_results=None,
    streak=0,
    goals_for=None,
    goals_against=None,
    xg_for=None,
    xg_against=None,
):
    return TeamForm(
        team_api_id=1,
        matches_considered=matches,
        last_results=last_results or [],
        streak=streak,
        goals_for=goals_for or [],
        goals_against=goals_against or [],
        xg_for=xg_for or [],
        xg_against=xg_against or [],
    )


def _ctx(
    home_form=None,
    away_form=None,
    h2h_fixtures=None,
    home_name="Real Madrid",
    away_name="Barcelona",
):
    fixture = {
        "league_name": "La Liga",
        "home_team_api_id": 1,
        "away_team_api_id": 2,
        "home_team_name": home_name,
        "away_team_name": away_name,
    }
    return MatchContext(
        fixture=fixture,
        home_form=home_form or _form(),
        away_form=away_form or _form(),
        h2h=HeadToHead(team_a_id=1, team_b_id=2, fixtures=h2h_fixtures or []),
    )


def test_home_win_pick_uses_winning_streak_bullet():
    home = _form(streak=5, last_results=["W"] * 5)
    ctx = _ctx(home_form=home)
    out = build_narrative(ctx, "1X2", "home_win")
    assert any("5 victorias" in b for b in out["bullets"])


def test_btts_yes_pick_quotes_h2h_rate():
    h2h = [
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 2, "score_away": 1},
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 3, "score_away": 2},
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 1, "score_away": 1},
        {"home_team_api_id": 2, "away_team_api_id": 1, "score_home": 0, "score_away": 0},  # no AA
        {"home_team_api_id": 1, "away_team_api_id": 2, "score_home": 2, "score_away": 2},
    ]
    ctx = _ctx(h2h_fixtures=h2h)
    out = build_narrative(ctx, "BTTS", "btts_yes")
    # 4/5 H2H with BTTS = 80%
    assert any("AA en 4/5" in b or "AA en 4 / 5" in b for b in out["bullets"])


def test_over_2_5_uses_combined_average():
    home = _form(goals_for=[2, 3, 2, 1, 2], goals_against=[1, 1, 0, 1, 2])
    away = _form(goals_for=[1, 2, 2, 2, 1], goals_against=[1, 2, 1, 1, 1])
    ctx = _ctx(home_form=home, away_form=away)
    out = build_narrative(ctx, "OVER_UNDER_2_5", "over_2_5")
    assert any("Promedio combinado" in b for b in out["bullets"])


def test_no_data_returns_at_least_one_bullet_or_empty():
    out = build_narrative(_ctx(), "1X2", "home_win")
    # Empty form -> may have empty bullets, opening always present
    assert "opening" in out
    assert isinstance(out["bullets"], list)


def test_narrative_caps_at_max_bullets():
    home = _form(
        streak=5,
        last_results=["W"] * 5,
        goals_for=[3, 3, 3, 3, 3],
        goals_against=[0, 0, 0, 0, 0],
        xg_for=[2.5] * 5,
        xg_against=[0.5] * 5,
    )
    away = _form(
        last_results=["L"] * 5,
        goals_for=[0, 0, 0, 0, 0],
        goals_against=[3, 3, 3, 3, 3],
        xg_for=[0.4] * 5,
        xg_against=[2.5] * 5,
    )
    ctx = _ctx(home_form=home, away_form=away)
    out = build_narrative(ctx, "1X2", "home_win", max_bullets=3)
    assert len(out["bullets"]) <= 3


def test_opening_line_mentions_competition():
    ctx = _ctx()
    out = build_narrative(ctx, "1X2", "home_win")
    assert "La Liga" in out["opening"]
