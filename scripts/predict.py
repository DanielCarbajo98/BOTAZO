"""One-off match predictor — useful for sanity-checking the model.

Usage:
    PYTHONPATH=. python scripts/predict.py "Real Madrid" "Real Sociedad"

Looks up both teams by name (partial match), pulls every fixture that
involves either of them, computes recent-form xG and replays Elo over the
full season, then prints lambdas and 1X2/O-U/BTTS probabilities.
"""
from __future__ import annotations

import sys
from typing import List

from src.config import Config, setup_logging
from src.models.elo import EloRater
from src.models.predictor import predict_match
from src.models.xg_adjusted import compute_team_form
from src.storage.repository import (
    all_finished_fixtures,
    find_team_by_name,
    fixture_stats_for_fixtures,
    fixtures_recent_by_team,
)


def _resolve(name: str) -> dict:
    matches = find_team_by_name(name)
    if not matches:
        raise SystemExit(f"No team matched '{name}'. Try a different fragment.")
    if len(matches) > 1:
        # Pick exact (case-insensitive) match if there is one.
        exact = [t for t in matches if t["name"].lower() == name.lower()]
        if exact:
            return exact[0]
        print(f"Multiple teams matched '{name}':", file=sys.stderr)
        for t in matches:
            print(f"  - {t['name']} ({t.get('league_name')})", file=sys.stderr)
        raise SystemExit("Be more specific.")
    return matches[0]


def main(argv: List[str]) -> int:
    if len(argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    home_query, away_query = argv[1], argv[2]

    cfg = Config.from_env()
    setup_logging(cfg.log_level)
    cfg.require()

    home = _resolve(home_query)
    away = _resolve(away_query)
    print(f"Home: {home['name']}  (api_id={home['api_id']}, league={home.get('league_name')})")
    print(f"Away: {away['name']}  (api_id={away['api_id']}, league={away.get('league_name')})")

    home_recent = fixtures_recent_by_team(home["api_id"], limit=20)
    away_recent = fixtures_recent_by_team(away["api_id"], limit=20)
    fixture_ids = {f["api_id"] for f in home_recent + away_recent if f.get("api_id") is not None}
    stats = fixture_stats_for_fixtures(list(fixture_ids))

    home_form = compute_team_form(home_recent, stats, home["api_id"], n=10)
    away_form = compute_team_form(away_recent, stats, away["api_id"], n=10)

    print("\nForm (last 10):")
    print(f"  {home['name']:30s}  matches={home_form.matches:2d}  xG_for={home_form.avg_xg_for:.2f}  xG_against={home_form.avg_xg_against:.2f}  xG_used={home_form.used_xg}")
    print(f"  {away['name']:30s}  matches={away_form.matches:2d}  xG_for={away_form.avg_xg_for:.2f}  xG_against={away_form.avg_xg_against:.2f}  xG_used={away_form.used_xg}")

    print("\nReplaying Elo over all finished fixtures…")
    elo = EloRater()
    elo.feed_fixtures(all_finished_fixtures())
    print(f"  Elo {home['name']}: {elo.get(home['api_id']):.0f}")
    print(f"  Elo {away['name']}: {elo.get(away['api_id']):.0f}")

    pred = predict_match(home_form, away_form, elo=elo)
    p = pred.probabilities

    print("\nPrediction:")
    print(f"  Expected goals: home={pred.lambda_home:.2f}  away={pred.lambda_away:.2f}")
    print(f"  1X2:    home_win={p['home_win']*100:5.1f}%   draw={p['draw']*100:5.1f}%   away_win={p['away_win']*100:5.1f}%")
    print(f"  Goals:  over_2_5={p['over_2_5']*100:5.1f}%  under_2_5={p['under_2_5']*100:5.1f}%")
    print(f"  BTTS:   yes={p['btts_yes']*100:5.1f}%        no={p['btts_no']*100:5.1f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
