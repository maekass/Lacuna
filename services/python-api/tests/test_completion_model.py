import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.completion_model import CompletionRegistry, RegistryError, get_completion_registry
from app.config import get_settings
from app.main import _completion_registry, app

REGISTRY = get_settings().completion_registry_dir
MANIFEST = json.loads((REGISTRY / "manifest.json").read_text())
CHAMPION = MANIFEST["champion"]
PARITY = json.loads((REGISTRY / "parity_fixtures.json").read_text())

VALID_TRIAL = {
    "title": "Phase 3 study of elagolix for endometriosis-associated pain",
    "condition": ["Endometriosis"],
    "interventions": ["Elagolix", "Placebo"],
    "sponsor": "AbbVie Inc",
    "phase": "PHASE3",
    "study_type": "INTERVENTIONAL",
}


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
    assert PARITY
    for fixture in PARITY:
        response = client.post(
            f"/v1/models/completion/predict?version={CHAMPION}",
            json=_as_api_input(fixture["trial"]),
        )
        assert response.status_code == 200, response.text
        assert response.json()["probability_completed"] == pytest.approx(
            fixture["expected"][CHAMPION], abs=1e-9
        )


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
