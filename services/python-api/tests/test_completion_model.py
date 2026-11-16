import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import shadow_log
from app.completion_model import CompletionRegistry, RegistryError, get_completion_registry
from app.config import get_settings
from app.main import _completion_registry, app

REGISTRY = get_settings().completion_registry_dir
MANIFEST = json.loads((REGISTRY / "manifest.json").read_text())
CHAMPION = MANIFEST["champion"]
PARITY = json.loads((REGISTRY / "parity_fixtures.json").read_text())
V3 = "3.0.0-logreg"
V4 = "4.0.0-logreg-pit"
PARITY_V4_PATH = REGISTRY / "parity_fixtures_v4.json"
PARITY_V4 = json.loads(PARITY_V4_PATH.read_text()) if PARITY_V4_PATH.exists() else []

VALID_TRIAL = {
    "title": "Phase 3 study of elagolix for endometriosis-associated pain",
    "condition": ["Endometriosis"],
    "interventions": ["Elagolix", "Placebo"],
    "sponsor": "AbbVie Inc",
    "phase": "PHASE3",
    "study_type": "INTERVENTIONAL",
}


@pytest.fixture(autouse=True)
def shadow_log_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Keep every test's shadow log in tmp (never the repo's var/ path)."""
    path = tmp_path / "shadow" / "log.jsonl"
    monkeypatch.setenv("COMPLETION_SHADOW_LOG", str(path))
    get_settings.cache_clear()
    yield path
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides.clear()
    return TestClient(app)


def _as_api_input(trial: dict) -> dict:
    split = lambda v: [x.strip() for x in str(v or "").split(",") if x.strip()]  # noqa: E731
    phase = str(trial["phase"]).upper().replace(" ", "_")
    return {
        "title": trial["title"],
        "condition": split(trial["condition"]),
        "interventions": split(trial["interventions"]),
        "sponsor": trial["sponsor"],
        "phase": phase if phase in {"EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "NA", "NOT_APPLICABLE"} else "NA",
        "study_type": trial["study_type"],
    }


def test_predict_champion_response_contract(client: TestClient) -> None:
    response = client.post("/v1/models/completion/predict", json=VALID_TRIAL)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["model_id"] == MANIFEST["model_id"]
    assert body["model_version"] == CHAMPION
    assert body["artifact_sha256"] == MANIFEST["versions"][CHAMPION]["artifact_sha256"]
    assert 0.0 <= body["probability_completed"] <= 1.0
    assert body["calibrated"] is True
    assert body["calibration_method"] == "sigmoid"
    assert "not a prediction of efficacy" in body["disclaimer"]
    assert body["export_gate_passed"] == MANIFEST["versions"][CHAMPION]["holdout_metrics"]["export_gate"]["passes"]


def test_predict_explicit_version(client: TestClient) -> None:
    response = client.post(f"/v1/models/completion/predict?version={CHAMPION}", json=VALID_TRIAL)
    assert response.status_code == 200
    assert response.json()["model_version"] == CHAMPION


def test_predict_matches_training_parity_fixtures(client: TestClient) -> None:
    """v3 parity fixtures (design fields only) still match the served v3 artifact."""
    assert PARITY
    for fixture in PARITY:
        response = client.post(
            f"/v1/models/completion/predict?version={V3}",
            json=_as_api_input(fixture["trial"]),
        )
        assert response.status_code == 200, response.text
        assert response.json()["probability_completed"] == pytest.approx(fixture["expected"][V3], abs=1e-9)


@pytest.mark.skipif(V4 not in MANIFEST["versions"], reason="v4 not served")
def test_predict_matches_v4_point_in_time_parity_fixtures(client: TestClient) -> None:
    """API v4 featurizer + sponsor index reproduce the training-side rows and probabilities."""
    from app import completion_pit_features as pitf

    assert len(PARITY_V4) >= 8
    loaded = get_completion_registry().load(V4)
    for fixture in PARITY_V4:
        extra, _ = pitf.pit_features(fixture["api_input"], loaded.sponsor_index, loaded.entry["v0_training_medians"])
        assert extra == pytest.approx(fixture["expected_pit_row"], abs=1e-12), fixture["nct_id"]
        for version in (V3, V4):
            response = client.post(f"/v1/models/completion/predict?version={version}", json=fixture["api_input"])
            assert response.status_code == 200, response.text
            assert response.json()["probability_completed"] == pytest.approx(fixture["expected"][version], abs=1e-9)


def test_predict_unknown_version_404(client: TestClient) -> None:
    response = client.post("/v1/models/completion/predict?version=9.9.9-nope", json=VALID_TRIAL)
    assert response.status_code == 404
    assert "Unknown model version" in response.json()["detail"]


def test_non_served_challenger_version_404(client: TestClient) -> None:
    for version in MANIFEST.get("evaluated_not_served", {}):
        response = client.post(f"/v1/models/completion/predict?version={version}", json=VALID_TRIAL)
        assert response.status_code == 404


def test_version_path_traversal_rejected(client: TestClient) -> None:
    response = client.post("/v1/models/completion/predict?version=../../etc", json=VALID_TRIAL)
    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {**VALID_TRIAL, "title": ""},
        {**VALID_TRIAL, "title": "x" * 501},
        {**VALID_TRIAL, "phase": "PHASE9"},
        {**VALID_TRIAL, "study_type": "UNKNOWN"},
        {**VALID_TRIAL, "condition": "Endometriosis"},
        {**VALID_TRIAL, "interventions": ["a" * 301]},
        {**VALID_TRIAL, "enrollment": 120},
        {**VALID_TRIAL, "status": "COMPLETED"},
        {**VALID_TRIAL, "has_results": True},
        {**VALID_TRIAL, "overall_status": "WITHDRAWN"},
        {**VALID_TRIAL, "completion_date": "2025-01-01"},
        {**VALID_TRIAL, "why_stopped": "funding"},
        {**VALID_TRIAL, "start_year": 2025},
        {**VALID_TRIAL, "sponsor_prior_stop_rate_smoothed": 0.1},
        {**VALID_TRIAL, "v0_enrollment_log10": 2.0},
        {**VALID_TRIAL, "reviewer_decision": "maybe"},
        {**VALID_TRIAL, "reviewer_override": True},
        {**VALID_TRIAL, "nct_id": "NCT123"},
        {**VALID_TRIAL, "nct_id": "nct01234567"},
        {**VALID_TRIAL, "registered_status": "COMPLETED"},
        {**VALID_TRIAL, "registered_status": "TERMINATED"},
        {**VALID_TRIAL, "registered_enrollment": 100},
        {**VALID_TRIAL, "registered_status": "RECRUITING", "registered_enrollment": -1},
        {**VALID_TRIAL, "start_date": "March 2024"},
        {**VALID_TRIAL, "first_submit_date": "2024-13-45x"},
        {**VALID_TRIAL, "actual_enrollment": 10},
        {**VALID_TRIAL, "sponsor_prior_trials": 3},
    ],
)
def test_predict_validation_errors(client: TestClient, payload: dict) -> None:
    response = client.post("/v1/models/completion/predict", json=payload)
    assert response.status_code == 422


def test_model_card(client: TestClient) -> None:
    response = client.get("/v1/models/completion")
    assert response.status_code == 200
    card = response.json()
    assert card["model_version"] == CHAMPION
    assert card["champion_version"] == CHAMPION
    assert card["artifact_sha256"] == MANIFEST["versions"][CHAMPION]["artifact_sha256"]
    assert card["split"]["strategy"] == "start_year_holdout"
    assert "roc_auc" in card["holdout_metrics"]
    assert "enrollment" in card["excluded_fields"]
    assert card["disclaimer"]


def test_model_card_unknown_version_404(client: TestClient) -> None:
    response = client.get("/v1/models/completion?version=0.0.0")
    assert response.status_code == 404


def _copy_registry(tmp_path: Path) -> Path:
    target = tmp_path / "completion"
    shutil.copytree(REGISTRY, target)
    return target


def test_tampered_artifact_returns_503(client: TestClient, tmp_path: Path) -> None:
    root = _copy_registry(tmp_path)
    artifact = root / MANIFEST["versions"][CHAMPION]["artifact"]
    artifact.write_bytes(artifact.read_bytes() + b"tamper")
    app.dependency_overrides[_completion_registry] = lambda: CompletionRegistry(root)
    try:
        response = client.post("/v1/models/completion/predict", json=VALID_TRIAL)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert "sha256 mismatch" in response.json()["detail"]


def test_sklearn_minor_mismatch_returns_503(client: TestClient, tmp_path: Path) -> None:
    root = _copy_registry(tmp_path)
    manifest = json.loads((root / "manifest.json").read_text())
    manifest["sklearn_version"] = "0.1.0"
    (root / "manifest.json").write_text(json.dumps(manifest))
    app.dependency_overrides[_completion_registry] = lambda: CompletionRegistry(root)
    try:
        response = client.post("/v1/models/completion/predict", json=VALID_TRIAL)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503


def test_missing_registry_returns_503(client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(RegistryError):
        CompletionRegistry(tmp_path / "missing")
    monkeypatch.setenv("COMPLETION_REGISTRY_DIR", str(tmp_path / "missing"))
    get_settings.cache_clear()
    get_completion_registry.cache_clear()
    try:
        response = client.get("/v1/models/completion")
    finally:
        monkeypatch.delenv("COMPLETION_REGISTRY_DIR")
        get_settings.cache_clear()
        get_completion_registry.cache_clear()
    assert response.status_code == 503


def test_predict_returns_decision_fields_and_explanations(client: TestClient) -> None:
    body = client.post("/v1/models/completion/predict", json=VALID_TRIAL).json()
    assert body["risk_stopped"] == pytest.approx(1.0 - body["probability_completed"])
    assert body["rank_bucket"] in shadow_log.BUCKETS
    assert body["model_flags_for_review"] == shadow_log.flagged_for_review(body["rank_bucket"])
    gate = MANIFEST["versions"][CHAMPION]["holdout_metrics"]["export_gate"]
    assert body["export_gate_version"] == gate.get("gate_version", "legacy")
    assert 1 <= len(body["top_features"]) <= 5
    contributions = [abs(item["contribution_logit"]) for item in body["top_features"]]
    assert contributions == sorted(contributions, reverse=True)
    for item in body["top_features"]:
        assert item["kind"] in {"text_term", "numeric"}
        assert item["direction"] == ("toward_completed" if item["contribution_logit"] > 0 else "toward_stopped")
    assert "logit" in body["explanation_method"]


def test_rank_bucket_uses_manifest_thresholds(client: TestClient) -> None:
    thresholds = MANIFEST["versions"][CHAMPION].get("rank_thresholds_risk")
    if not thresholds:
        pytest.skip("registry has no rank thresholds")
    inputs = [_as_api_input(f["trial"]) for f in PARITY] + [f["api_input"] for f in PARITY_V4]
    for payload in inputs:
        body = client.post("/v1/models/completion/predict", json=payload).json()
        assert body["rank_bucket"] == shadow_log.rank_bucket(body["risk_stopped"], thresholds)


def test_explanations_match_logit(client: TestClient) -> None:
    """Sum of all contributions + intercept equals the uncalibrated logit."""
    import numpy as np

    from app import completion_features as cf
    from app.completion_model import explain_logistic

    for version in MANIFEST["versions"]:
        loaded = get_completion_registry().load(version)
        raw, _ = loaded.row(PARITY_V4[0]["api_input"] if PARITY_V4 else VALID_TRIAL)
        row = np.asarray([raw], dtype=object)
        top, _ = explain_logistic(loaded.estimator, row, top_n=10_000, numeric_names=loaded.numeric_names)
        pipe = loaded.estimator.calibrated_classifiers_[0].estimator.estimator
        logit = float(pipe.decision_function(row)[0])
        intercept = float(pipe.named_steps["clf"].intercept_[0])
        assert sum(c.contribution_logit for c in top) + intercept == pytest.approx(logit, abs=1e-9), version
    assert cf.model_row(VALID_TRIAL)  # base featurizer unchanged for v3


def test_non_feature_fields_do_not_change_probability(client: TestClient) -> None:
    plain = client.post("/v1/models/completion/predict", json=VALID_TRIAL).json()
    tagged = client.post(
        "/v1/models/completion/predict",
        json={**VALID_TRIAL, "nct_id": "NCT01234567", "reviewer_decision": "review"},
    ).json()
    assert tagged["probability_completed"] == plain["probability_completed"]
    assert tagged["nct_id"] == "NCT01234567"
    assert tagged["reviewer_decision"] == "review"
    assert tagged["reviewer_override"] == (not plain["model_flags_for_review"])


def test_shadow_log_appends_and_verifies(client: TestClient, shadow_log_path: Path) -> None:
    first = client.post("/v1/models/completion/predict", json={**VALID_TRIAL, "nct_id": "NCT01234567"}).json()
    assert first["shadow_logged"] is True
    before = shadow_log_path.read_bytes()
    client.post(
        "/v1/models/completion/predict",
        json={**VALID_TRIAL, "nct_id": "NCT07654321", "reviewer_decision": "no_review"},
    )
    assert shadow_log_path.read_bytes().startswith(before)
    records = shadow_log.read_log(shadow_log_path)
    assert [r["nct_id"] for r in records] == ["NCT01234567", "NCT07654321"]
    rec = records[1]
    for key in ("predicted_at", "model_version", "artifact_sha256", "probability_completed", "rank_bucket"):
        assert key in rec
    assert rec["model_version"] == CHAMPION
    assert rec["artifact_sha256"] == MANIFEST["versions"][CHAMPION]["artifact_sha256"]
    assert rec["reviewer_decision"] == "no_review"
    assert rec["source"] == "api"


def test_validation_error_is_not_logged(client: TestClient, shadow_log_path: Path) -> None:
    response = client.post("/v1/models/completion/predict", json={**VALID_TRIAL, "status": "COMPLETED"})
    assert response.status_code == 422
    assert not shadow_log_path.exists()


def test_shadow_log_can_be_disabled(client: TestClient, shadow_log_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("COMPLETION_SHADOW_LOG", "off")
    get_settings.cache_clear()
    body = client.post("/v1/models/completion/predict", json=VALID_TRIAL).json()
    assert body["shadow_logged"] is False
    assert not shadow_log_path.exists()


def test_unwritable_shadow_log_still_predicts(client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    blocker = tmp_path / "not_a_dir"
    blocker.write_text("x")
    monkeypatch.setenv("COMPLETION_SHADOW_LOG", str(blocker / "log.jsonl"))
    get_settings.cache_clear()
    response = client.post("/v1/models/completion/predict", json=VALID_TRIAL)
    assert response.status_code == 200
    assert response.json()["shadow_logged"] is False


def test_model_card_includes_decision_tool(client: TestClient) -> None:
    card = client.get("/v1/models/completion").json()
    assert "request_only_fields" in card
    if MANIFEST.get("decision_tool"):
        assert card["decision_tool"]["gate_version"] == "decision-gate-v1"
        assert set(card["decision_metrics"]) == {"top_5pct", "top_10pct", "top_20pct"}


@pytest.mark.skipif(V4 not in MANIFEST["versions"], reason="v4 not served")
def test_v4_point_in_time_audit_and_v3_ignores_pit_inputs(client: TestClient) -> None:
    payload = {
        **VALID_TRIAL,
        "start_date": "2024-03",
        "first_submit_date": "2024-01-15",
        "registered_status": "NOT_YET_RECRUITING",
        "registered_enrollment": 300,
        "registered_site_count": 12,
        "registered_start_date": "2024-03",
        "registered_completion_date": "2026-06",
    }
    v4 = client.post(f"/v1/models/completion/predict?version={V4}", json=payload).json()
    assert v4["featurizer_version"] == "completion-features-v4-pit"
    audit = v4["point_in_time"]
    assert audit["anchor_date"] == "2024-01-15"
    assert audit["registration_features_imputed"] is False
    assert audit["sponsor_prior_trials"] >= audit["sponsor_prior_stopped"] >= 0
    plain_v3 = client.post(f"/v1/models/completion/predict?version={V3}", json=VALID_TRIAL).json()
    pit_v3 = client.post(f"/v1/models/completion/predict?version={V3}", json=payload).json()
    assert pit_v3["probability_completed"] == plain_v3["probability_completed"]
    assert pit_v3["point_in_time"] is None
    imputed = client.post(f"/v1/models/completion/predict?version={V4}", json=VALID_TRIAL).json()
    assert imputed["point_in_time"]["registration_features_imputed"] is True
    assert imputed["point_in_time"]["anchor_date"] is None
    assert imputed["point_in_time"]["sponsor_prior_trials"] == 0


@pytest.mark.skipif(V4 not in MANIFEST["versions"], reason="v4 not served")
def test_v4_sponsor_history_counts_only_outcomes_before_anchor(client: TestClient) -> None:
    from app import completion_pit_features as pitf

    index = get_completion_registry().load(V4).sponsor_index
    payload = json.loads((REGISTRY / MANIFEST["versions"][V4]["sponsor_index"]).read_text())
    sponsor, events = max(payload["sponsors"].items(), key=lambda kv: len(kv[1]))
    dates = sorted(pitf.parse_date(d) for d, _ in events)
    mid = dates[len(dates) // 2]
    n, stopped = index.counts(sponsor, mid)
    assert n == sum(1 for d in dates if d < mid)
    assert stopped == sum(int(s) for d, s in events if pitf.parse_date(d) < mid)
    assert index.counts(sponsor, dates[0]) == (0, 0)  # strictly before


@pytest.mark.skipif(V4 not in MANIFEST["versions"], reason="v4 not served")
def test_tampered_sponsor_index_returns_503(client: TestClient, tmp_path: Path) -> None:
    root = _copy_registry(tmp_path)
    index = root / MANIFEST["versions"][V4]["sponsor_index"]
    index.write_text(index.read_text().replace('"smoothing_alpha": 5.0', '"smoothing_alpha": 0.0'))
    app.dependency_overrides[_completion_registry] = lambda: CompletionRegistry(root)
    try:
        response = client.post(f"/v1/models/completion/predict?version={V4}", json=VALID_TRIAL)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert "sponsor index sha256 mismatch" in response.json()["detail"]
