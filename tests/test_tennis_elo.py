from src.models.tennis_elo import (
    INITIAL_RATING,
    TennisEloRater,
    expected_win,
)


def test_expected_win_symmetric_at_equal_ratings():
    assert abs(expected_win(1500, 1500) - 0.5) < 1e-9


def test_expected_win_higher_rating_wins_more():
    p_higher = expected_win(1700, 1500)
    p_lower = expected_win(1500, 1700)
    assert p_higher > 0.7
    assert abs(p_higher + p_lower - 1.0) < 1e-9


def test_winner_gains_loser_loses():
    rater = TennisEloRater()
    rater.update_match(winner_api_id=1, loser_api_id=2, surface="Hard")
    assert rater.get(1).overall > INITIAL_RATING
    assert rater.get(2).overall < INITIAL_RATING


def test_rating_zero_sum():
    rater = TennisEloRater()
    rater.update_match(1, 2, "Hard")
    delta_winner = rater.get(1).overall - INITIAL_RATING
    delta_loser = INITIAL_RATING - rater.get(2).overall
    assert abs(delta_winner - delta_loser) < 1e-9


def test_surface_only_updates_when_known():
    rater = TennisEloRater()
    rater.update_match(1, 2, "Mars")  # bogus surface
    # Overall changed; surface ratings stay at initial
    assert rater.get(1).overall != INITIAL_RATING
    assert rater.get(1).clay == INITIAL_RATING
    assert rater.get(1).hard == INITIAL_RATING
    assert rater.get(1).grass == INITIAL_RATING


def test_specialised_clay_player_outranks_hard_specialist_on_clay():
    rater = TennisEloRater()
    # 1 wins 30 clay matches in a row vs different opponents
    for opponent in range(2, 32):
        rater.update_match(1, opponent, "Clay")
    # 100 hard wins by player 100
    for opponent in range(101, 131):
        rater.update_match(100, opponent, "Hard")

    p1_clay = rater.get(1).playable("Clay")
    p100_clay = rater.get(100).playable("Clay")
    assert p1_clay > p100_clay


def test_feed_matches_counts_processed_only():
    rater = TennisEloRater()
    matches = [
        {"winner_api_id": 1, "loser_api_id": 2, "surface": "Hard"},
        {"winner_api_id": None, "loser_api_id": 2, "surface": "Hard"},
        {"winner_api_id": 1, "loser_api_id": 3, "surface": "Clay"},
    ]
    n = rater.feed_matches(matches)
    assert n == 2


def test_snapshot_returns_one_row_per_player():
    rater = TennisEloRater()
    rater.update_match(1, 2, "Hard")
    rater.update_match(1, 3, "Clay")
    snap = rater.snapshot()
    ids = {row["player_api_id"] for row in snap}
    assert ids == {1, 2, 3}
    p1 = next(row for row in snap if row["player_api_id"] == 1)
    assert p1["matches_played"] == 2
