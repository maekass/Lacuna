"""Seeded-defect tests paired with clean controls."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lacuna_informatics.cohort import CohortQuery, count, paid_summary, raw_count  # noqa: E402
from lacuna_informatics.i2b2 import LoadError, Store, iter_resources  # noqa: E402
from lacuna_informatics.synthetic import make_bundle  # noqa: E402


def loaded(n=40):
    s = Store()
    s.load((e["resource"] for e in make_bundle(n)["entry"]), "synthetic", "test")
    return s


def q(*panels):
    return CohortQuery.from_json({"expectedResultType": "COUNT", "panels": list(panels)})


def test_clean_load_counts():
    s = Store()
    rep = s.load((e["resource"] for e in make_bundle(40)["entry"]), "synthetic", "test")
    assert rep.patients == 40 and rep.encounters == 40
    assert s.con.execute("SELECT COUNT(*) FROM patient_dimension").fetchone()[0] == 40


def test_panel_or_within_and_across():
    s = loaded()
    # Both endometriosis profiles: 16 of 40 have N80.0 or N80.3, all with 58662.
    assert raw_count(s, q({"concepts": ["ICD10CM:N80.0", "ICD10CM:N80.3"]},
                          {"concepts": ["CPT:58662"]})) == 16
    assert raw_count(s, q({"concepts": ["ICD10CM:N80.0"]}, {"concepts": ["CPT:58558"]})) == 0


def test_exclusion_panel():
    s = loaded()
    n = raw_count(s, q({"concepts": ["ICD10CM:N80.0", "ICD10CM:N92.0"]},
                       {"concepts": ["CPT:58558"], "exclude": True}))
    assert n == 8


def test_small_cell_suppressed():
    s = loaded(10)  # 2 per profile
    out = count(s, q({"concepts": ["ICD10CM:N80.0"]}))
    assert out == {"count": None, "display": "1 to 10", "suppressed": True}


def test_large_cell_not_suppressed():
    s = loaded(60)
    assert count(s, q({"concepts": ["ICD10CM:N80.0"]}))["count"] == 12


def test_zero_is_reported_not_suppressed():
    assert count(loaded(), q({"concepts": ["ICD10CM:C50.911"]}))["count"] == 0


def test_row_level_request_rejected():
    with pytest.raises(ValueError):
        CohortQuery.from_json({"expectedResultType": "PATIENT_LIST", "panels": [{"concepts": ["CPT:58662"]}]})


def test_exclusion_only_rejected():
    with pytest.raises(ValueError):
        q({"concepts": ["CPT:58662"], "exclude": True})


def test_unknown_data_class_rejected():
    with pytest.raises(LoadError):
        Store().load([], "phi", "test")


def test_orphan_fact_rejected():
    bad = [{"resourceType": "Condition", "id": "c1", "subject": {"reference": "Patient/missing"},
            "code": {"coding": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "N80.0"}]}}]
    with pytest.raises(LoadError):
        Store().load(bad, "synthetic", "test")


def test_duplicate_patient_rejected():
    p = {"resourceType": "Patient", "id": "p1"}
    with pytest.raises(LoadError):
        Store().load([p, p], "synthetic", "test")


def test_no_full_birth_dates_or_descriptors_stored():
    s = loaded()
    cols = [r[0] for r in s.con.execute("DESCRIBE patient_dimension").fetchall()]
    assert "birth_date" not in cols
    names = {r[0] for r in s.con.execute("SELECT name_char FROM concept_dimension").fetchall()}
    assert all(":" in n and " " not in n for n in names)  # code numbers only


def test_paid_summary_suppression_and_value():
    assert paid_summary(loaded(10), "CPT:58662")["suppressed"] is True
    big = paid_summary(loaded(60), "CPT:58662")
    assert big["patients"] == 24 and 300 < big["mean"] < 1100


def test_ndjson_reader(tmp_path):
    f = tmp_path / "x.ndjson"
    f.write_text("\n".join(json.dumps(e["resource"]) for e in make_bundle(5)["entry"]))
    assert sum(1 for _ in iter_resources(f)) == len(make_bundle(5)["entry"])
