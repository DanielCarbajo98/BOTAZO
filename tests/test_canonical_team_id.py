from src.utils.ids import canonical_team_id, team_id


def test_canonical_strips_common_suffixes():
    assert canonical_team_id("Real Madrid CF") == canonical_team_id("Real Madrid")
    assert canonical_team_id("Liverpool FC") == canonical_team_id("Liverpool")
    assert canonical_team_id("Borussia Dortmund") == canonical_team_id("Borussia Dortmund")


def test_canonical_strips_diacritics():
    assert canonical_team_id("Atlético Madrid") == canonical_team_id("Atletico Madrid")


def test_canonical_strips_parenthetical():
    assert canonical_team_id("Eintracht Frankfurt (W)") == canonical_team_id("Eintracht Frankfurt")


def test_canonical_strips_year_suffix():
    assert canonical_team_id("Schalke 04") == canonical_team_id("Schalke")
    assert canonical_team_id("Hertha BSC") == canonical_team_id("Hertha")


def test_canonical_handles_prefix():
    assert canonical_team_id("FC Barcelona") == canonical_team_id("Barcelona")
    assert canonical_team_id("AC Milan") == canonical_team_id("Milan")


def test_strict_team_id_does_not_collide_with_canonical():
    """Canonical and strict ids must be different namespaces — otherwise
    we couldn't keep both per-source primary keys and cross-source joins."""
    assert canonical_team_id("Real Madrid") != team_id("Real Madrid")


def test_canonical_distinct_for_different_clubs():
    assert canonical_team_id("Real Madrid") != canonical_team_id("Barcelona")
    assert canonical_team_id("Liverpool") != canonical_team_id("Manchester United")
