"""Offline tests for the Sackmann CSV parser."""
from src.collectors.tennis_sackmann import (
    match_api_id,
    matches_to_rows,
    parse_csv,
    player_api_id,
    players_from_matches,
)


SAMPLE_CSV = (
    "tourney_id,tourney_name,surface,draw_size,tourney_level,tourney_date,match_num,"
    "winner_id,winner_seed,winner_entry,winner_name,winner_hand,winner_ht,winner_ioc,winner_age,"
    "loser_id,loser_seed,loser_entry,loser_name,loser_hand,loser_ht,loser_ioc,loser_age,"
    "score,best_of,round,minutes\n"
    "2025-580,Roland Garros,Clay,128,G,20250525,1,"
    "207989,1,,Carlos Alcaraz,R,183,ESP,22,"
    "126203,15,,Jannik Sinner,R,188,ITA,23,"
    "6-4 6-2 6-3,5,F,150\n"
    "2025-580,Roland Garros,Clay,128,G,20250525,2,"
    "200282,3,,Novak Djokovic,R,188,SRB,38,"
    "126774,12,,Daniil Medvedev,R,198,RUS,29,"
    "7-5 6-4,3,QF,118\n"
)


def test_parse_csv_returns_matches():
    matches = parse_csv(SAMPLE_CSV, "ATP")
    assert len(matches) == 2
    final = matches[0]
    assert final.winner_name == "Carlos Alcaraz"
    assert final.loser_name == "Jannik Sinner"
    assert final.surface == "Clay"
    assert final.tour == "ATP"
    assert final.score == "6-4 6-2 6-3"
    assert final.date_iso.startswith("2025-05-25")


def test_player_api_id_uses_sackmann_id_when_present():
    a = player_api_id("ATP", "Carlos Alcaraz", sackmann_id="207989")
    b = player_api_id("ATP", "Carlos Alcaraz", sackmann_id="207989")
    c = player_api_id("ATP", "Carlos Alcaraz")  # without sackmann
    assert a == b
    assert a != c  # different keying


def test_match_api_id_order_independent():
    a = match_api_id("ATP", "2025-05-25", "Carlos Alcaraz", "Jannik Sinner")
    b = match_api_id("ATP", "2025-05-25", "Jannik Sinner", "Carlos Alcaraz")
    assert a == b


def test_players_from_matches_dedupes():
    matches = parse_csv(SAMPLE_CSV, "ATP")
    players = players_from_matches(matches)
    assert len(players) == 4
    names = sorted(p["name"] for p in players)
    assert names == ["Carlos Alcaraz", "Daniil Medvedev", "Jannik Sinner", "Novak Djokovic"]


def test_matches_to_rows_emit_finished_status():
    matches = parse_csv(SAMPLE_CSV, "ATP")
    rows = matches_to_rows(matches)
    assert all(r["status"] == "finished" for r in rows)
    assert all(r["winner_api_id"] == r["player1_api_id"] for r in rows)
