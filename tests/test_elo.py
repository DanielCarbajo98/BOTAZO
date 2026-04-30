from src.models.elo import (
    DEFAULT_RATING,
    EloRater,
    expected_score,
    update_pair,
)


def test_expected_score_symmetry():
    # Equal ratings, no home adv -> 0.5
    assert abs(expected_score(1500, 1500) - 0.5) < 1e-9


def test_expected_score_home_advantage_helps():
    p_no_adv = expected_score(1500, 1500, home_adv=0)
    p_with_adv = expected_score(1500, 1500, home_adv=65)
    assert p_with_adv > p_no_adv


def test_update_pair_winner_gains_loser_loses():
    h, a = update_pair(1500, 1500, 2, 1)
    assert h > 1500
    assert a < 1500
    # Conservation: home delta = -away delta
    assert abs((h - 1500) + (a - 1500)) < 1e-9


def test_update_pair_draw_with_home_adv_loses_for_home():
    # Equal ratings + home advantage: home is favourite, drawing means losing rating
    h, a = update_pair(1500, 1500, 1, 1)
    assert h < 1500
    assert a > 1500


def test_update_pair_bigger_margin_bigger_swing():
    h_close, _ = update_pair(1500, 1500, 1, 0)
    h_blowout, _ = update_pair(1500, 1500, 4, 0)
    assert (h_blowout - 1500) > (h_close - 1500)


def test_elo_rater_feeds_fixtures_chronologically():
    rater = EloRater()
    fixtures = [
        {
            "date": "2026-04-10T20:00:00Z",
            "status": "finished",
            "home_team_api_id": 1,
            "away_team_api_id": 2,
            "score_home": 3,
            "score_away": 0,
        },
        {
            "date": "2026-04-15T20:00:00Z",
            "status": "finished",
            "home_team_api_id": 2,
            "away_team_api_id": 1,
            "score_home": 0,
            "score_away": 1,
        },
        # Unfinished — must be ignored
        {
            "date": "2026-04-20T20:00:00Z",
            "status": "scheduled",
            "home_team_api_id": 1,
            "away_team_api_id": 2,
            "score_home": None,
            "score_away": None,
        },
    ]
    rater.feed_fixtures(fixtures)
    assert rater.get(1) > DEFAULT_RATING
    assert rater.get(2) < DEFAULT_RATING


def test_win_probability_strong_vs_weak():
    rater = EloRater(ratings={1: 1750, 2: 1450})
    p_home = rater.win_probability(1, 2)
    assert p_home > 0.80  # heavy favourite at home
