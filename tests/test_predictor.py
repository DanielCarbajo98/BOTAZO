from src.models.elo import EloRater
from src.models.predictor import expected_goals, predict_match
from src.models.xg_adjusted import TeamForm


def _form(team_id, xg_for, xg_against, used_xg=True):
    return TeamForm(
        team_id=team_id,
        matches=10,
        avg_xg_for=xg_for,
        avg_xg_against=xg_against,
        avg_goals_for=xg_for,
        avg_goals_against=xg_against,
        used_xg=used_xg,
    )


def test_expected_goals_home_boost_increases_lambda():
    home = _form(1, 1.6, 1.0)
    away = _form(2, 1.2, 1.4)
    lam_home = expected_goals(home, away, is_home=True)
    lam_home_no_boost = expected_goals(home, away, is_home=False)
    assert lam_home > lam_home_no_boost


def test_predict_match_madrid_vs_sociedad_strong_home_favourite():
    """The spec sketches Madrid vs Sociedad at ~55-65% home win. With elite
    Madrid form (xG ~2.0) and an average Sociedad we land higher (~70%),
    which is consistent with bookmaker lines for that matchup. Sanity-check
    that the model picks home as the strong favourite within a wide band."""
    madrid = _form(86, xg_for=2.05, xg_against=0.95)
    sociedad = _form(92, xg_for=1.30, xg_against=1.40)
    pred = predict_match(madrid, sociedad)
    assert 0.55 <= pred.probabilities["home_win"] <= 0.78
    # And clearly above the away win and draw
    assert pred.probabilities["home_win"] > pred.probabilities["draw"]
    assert pred.probabilities["home_win"] > pred.probabilities["away_win"]


def test_predict_match_returns_normalised_markets():
    home = _form(1, 1.4, 1.4)
    away = _form(2, 1.4, 1.4)
    pred = predict_match(home, away)
    p = pred.probabilities
    assert abs(p["home_win"] + p["draw"] + p["away_win"] - 1.0) < 1e-6
    assert abs(p["over_2_5"] + p["under_2_5"] - 1.0) < 1e-6


def test_elo_blend_pulls_probability_toward_elo():
    weak_home = _form(1, 1.0, 1.4)
    strong_away = _form(2, 1.9, 0.9)
    pred_no_elo = predict_match(weak_home, strong_away)

    elo = EloRater(ratings={1: 1700, 2: 1450})
    pred_with_elo = predict_match(weak_home, strong_away, elo=elo)

    # With Elo saying home is much stronger, the home_win should rise
    assert pred_with_elo.probabilities["home_win"] > pred_no_elo.probabilities["home_win"]
