"""Disease registry for Black-women health-equity focus indications."""

from src.disease_registry import FOCUS_DISEASE_IDS, get_disease, list_diseases


def test_focus_diseases_order() -> None:
    assert FOCUS_DISEASE_IDS == ("scd", "sle", "sarc")


def test_sle_ontology_codes() -> None:
    sle = get_disease("sle")
    assert sle.mesh_id == "D008180"
    assert sle.orpha_code == 536
    assert sle.trials_artifact == "clinical_trials_sle.csv"


def test_three_diseases_listed() -> None:
    assert len(list_diseases()) == 3


def test_sle_has_us_tickers() -> None:
    from src.disease_registry import us_tickers

    t = us_tickers(get_disease("sle").companies)
    assert "GSK" in t.values()
    assert all("." not in sym for sym in t.values())
