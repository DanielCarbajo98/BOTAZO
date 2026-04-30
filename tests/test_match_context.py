from src.analyzer.match_context import (
    HeadToHead,
    TeamForm,
    _streak,
    build_team_form,
)


def test_streak_positive_for_consecutive_wins():
    # most-recent first
    assert _streak(["W", "W", "W", "L"]) == 3


def test_streak_negative_for_consecutive_losses():
    assert _streak(["L", "L", "W"]) == -2


def test_streak_zero_when_top_is_draw():
    assert _streak(["D", "W", "W"]) == 0


def test_streak_zero_when_empty():
    assert _streak([]) == 0


def test_team_form_computes_btts_and_over_rates():
    fixtures = [
        {
            "api_id": 1,
            "status": "finished",
            "home_team_api_id": 10,
            "away_team_api_id": 20,
            "score_home": 2,
            "score_away": 1,
            "date": "2026-04-01",
        },
        {
            "api_id": 2,
            "status": "finished",
            "home_team_api_id": 30,
            "away_team_api_id": 10,
            "score_home": 0,
            "score_away": 1,
            "date": "2026-04-08",
        },
        {
            "api_id": 3,
            "status": "finished",
            "home_team_api_id": 10,
            "away_team_api_id": 40,
            "score_home": 0,
            "score_away": 0,
            "date": "2026-04-15",
        },
    ]
    form = build_team_form(team_id=10, fixtures=fixtures, stats_lookup={}, n=10)
    assert form.matches_considered == 3
    # As home team 10: 2 GF + 1 GF + 0 GF = 3 (last_first ordering)
    assert sum(form.goals_for) == 3
    # GA: 1 + 0 + 0 = 1
    assert sum(form.goals_against) == 1
    # Wins: against team 20 (W), against team 30 away (W), against 40 (D) -> 2W, 1D
    assert form.wins == 2
    # BTTS: only first match has both > 0 -> 1/3
    assert abs(form.btts_rate - 1 / 3) < 1e-9
    # Over 2.5: only first (3 goals) -> 1/3
    assert abs(form.over_2_5_rate - 1 / 3) < 1e-9


def test_head_to_head_counts_wins_per_side():
    h2h = HeadToHead(
        team_a_id=10,
        team_b_id=20,
        fixtures=[
            {"home_team_api_id": 10, "away_team_api_id": 20, "score_home": 2, "score_away": 0},
            {"home_team_api_id": 20, "away_team_api_id": 10, "score_home": 1, "score_away": 1},
            {"home_team_api_id": 20, "away_team_api_id": 10, "score_home": 3, "score_away": 0},
        ],
    )
    assert h2h.team_a_wins == 1
    assert h2h.team_b_wins == 1
    assert h2h.draws == 1
