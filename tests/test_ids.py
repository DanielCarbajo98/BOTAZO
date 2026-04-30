from src.utils.ids import fixture_id, stable_int_id, team_id


def test_stable_int_id_deterministic():
    assert stable_int_id("real madrid") == stable_int_id("Real Madrid")
    assert stable_int_id("real madrid") == stable_int_id("REAL  MADRID")


def test_stable_int_id_handles_accents():
    assert stable_int_id("Atlético Madrid") == stable_int_id("Atletico Madrid")


def test_team_id_distinct_for_different_names():
    assert team_id("Real Madrid") != team_id("Barcelona")


def test_fixture_id_uses_all_parts():
    a = fixture_id("2026-04-30", "Real Madrid", "Barcelona")
    b = fixture_id("2026-04-30", "Barcelona", "Real Madrid")
    assert a != b


def test_stable_int_id_is_positive_31bit():
    val = stable_int_id("anything", "with", "parts")
    assert 0 <= val <= 0x7FFFFFFF
