from src.models.xg_adjusted import (
    LEAGUE_AVG_XG,
    compute_team_form,
    league_baseline_form,
)


def _fixture(api_id, date, home_id, away_id, sh, sa, status="finished"):
    return {
        "api_id": api_id,
        "date": date,
        "home_team_api_id": home_id,
        "away_team_api_id": away_id,
        "score_home": sh,
        "score_away": sa,
        "status": status,
    }


def test_baseline_when_no_fixtures():
    form = compute_team_form([], {}, team_id=99, n=10)
    assert form.matches == 0
    assert form.avg_xg_for == LEAGUE_AVG_XG
    assert form.attack_strength == 1.0
    assert form.defense_weakness == 1.0


def test_xg_used_when_majority_have_stats():
    fixtures = [
        _fixture(1, "2026-04-01T20:00:00Z", 10, 20, 2, 1),
        _fixture(2, "2026-04-08T20:00:00Z", 20, 10, 1, 3),
        _fixture(3, "2026-04-15T20:00:00Z", 10, 30, 1, 0),
        _fixture(4, "2026-04-22T20:00:00Z", 40, 10, 0, 2),
    ]
    stats = {
        1: {"xg_home": 2.1, "xg_away": 0.8},
        2: {"xg_home": 0.9, "xg_away": 2.5},
        3: {"xg_home": 1.4, "xg_away": 0.4},
        4: {"xg_home": 0.5, "xg_away": 1.8},
    }
    form = compute_team_form(fixtures, stats, team_id=10, n=10)
    assert form.matches == 4
    assert form.used_xg is True
    # Team 10's xG_for: 2.1 (h), 2.5 (a), 1.4 (h), 1.8 (a) -> mean 1.95
    assert abs(form.avg_xg_for - 1.95) < 1e-9
    # xG_against: 0.8, 0.9, 0.4, 0.5 -> mean 0.65
    assert abs(form.avg_xg_against - 0.65) < 1e-9


def test_falls_back_to_goals_when_no_xg():
    fixtures = [
        _fixture(1, "2026-04-01T20:00:00Z", 10, 20, 3, 1),
        _fixture(2, "2026-04-08T20:00:00Z", 20, 10, 0, 2),
    ]
    form = compute_team_form(fixtures, fixture_stats_by_id={}, team_id=10, n=10)
    assert form.used_xg is False
    # team 10 scored 3 (h) and 2 (a) -> mean 2.5
    assert abs(form.avg_goals_for - 2.5) < 1e-9


def test_attack_strength_above_one_for_strong_team():
    fixtures = [
        _fixture(1, "2026-04-01T20:00:00Z", 10, 20, 4, 0),
        _fixture(2, "2026-04-08T20:00:00Z", 10, 30, 3, 1),
        _fixture(3, "2026-04-15T20:00:00Z", 40, 10, 0, 2),
    ]
    form = compute_team_form(fixtures, {}, team_id=10, n=10)
    assert form.attack_strength > 1.5  # 3 GF/match vs LEAGUE_AVG_XG (1.4)


def test_unfinished_fixtures_ignored():
    fixtures = [
        _fixture(1, "2026-04-01T20:00:00Z", 10, 20, 2, 0),
        _fixture(2, "2026-04-08T20:00:00Z", 10, 20, None, None, status="scheduled"),
    ]
    form = compute_team_form(fixtures, {}, team_id=10, n=10)
    assert form.matches == 1
