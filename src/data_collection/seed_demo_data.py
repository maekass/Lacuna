"""
Copy bundled demo CSVs into data/raw when files are missing or empty.

The demo bundle under data/demo/ is committed to git so deploys (e.g. Streamlit Cloud)
always have populated tables without waiting on external APIs.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from src.data_collection.data_manifest import ARTIFACT_REGISTRY

ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = ROOT / "data" / "demo"
DEMO_ML_DIR = DEMO_DIR / "ml"
DEMO_MODELS_DIR = DEMO_DIR / "models"
DEMO_QUANT_DIR = DEMO_DIR / "quant"
PROCESSED_QUANT_DIR = ROOT / "data" / "processed" / "quant"


def csv_has_data_rows(path: Path, min_rows: int = 1) -> bool:
    """True if file exists and has at least min_rows data rows (excludes header-only)."""
    if not path.is_file() or path.stat().st_size == 0:
        return False
    try:
        with path.open(encoding="utf-8", errors="replace") as f:
            lines = [ln for ln in f if ln.strip()]
    except OSError:
        return False
    # Header-only files have one line; multi-row stock exports need more.
    return len(lines) > min_rows


def demo_bundle_present(demo_dir: Path | None = None) -> bool:
    demo = Path(demo_dir) if demo_dir else DEMO_DIR
    marker = demo / "gene_therapy_pipeline_scd.csv"
    return marker.is_file() and csv_has_data_rows(marker)


def seed_from_demo(data_dir: Path | str, demo_dir: Path | str | None = None) -> int:
    """Copy every *.csv from demo_dir into data_dir. Returns number of files copied."""
    data_path = Path(data_dir)
    demo_path = Path(demo_dir) if demo_dir else DEMO_DIR
    data_path.mkdir(parents=True, exist_ok=True)
    if not demo_path.is_dir():
        return 0

    copied = 0
    for src in sorted(demo_path.glob("*.csv")):
        dest = data_path / src.name
        shutil.copy2(src, dest)
        copied += 1
    return copied


def sync_quant_from_demo(
    quant_dir: Path | str | None = None,
    processed_quant_dir: Path | str | None = None,
) -> bool:
    from src.quant_framework.quant_artifacts import quant_bundle_present, sync_quant_to_runtime

    src = Path(quant_dir) if quant_dir else DEMO_QUANT_DIR
    dest = Path(processed_quant_dir) if processed_quant_dir else PROCESSED_QUANT_DIR
    if not quant_bundle_present(src):
        return False
    if (dest / "backtest_metrics.csv").is_file():
        return True
    sync_quant_to_runtime(src, dest)
    return True


def sync_ml_from_demo(
    processed_dir: Path | str | None = None,
    models_dir: Path | str | None = None,
) -> bool:
    """Copy bundled ML CSVs and joblib models into runtime dirs when missing."""
    from src.models.ml_artifacts import ml_bundle_present, sync_ml_to_runtime

    if not ml_bundle_present(DEMO_ML_DIR):
        return False
    proc = Path(processed_dir) if processed_dir else ROOT / "data" / "processed"
    mods = Path(models_dir) if models_dir else ROOT / "data" / "models"
    from src.models.ml_artifacts import runtime_ml_present

    if runtime_ml_present(proc, mods):
        return True
    sync_ml_to_runtime(DEMO_ML_DIR, DEMO_MODELS_DIR, proc, mods)
    return runtime_ml_present(proc, mods)


def restore_empty_from_demo(data_dir: Path | str, demo_dir: Path | str | None = None) -> int:
    """Replace registered artifacts that are missing or header-only with demo copies."""
    data_path = Path(data_dir)
    demo_path = Path(demo_dir) if demo_dir else DEMO_DIR
    if not demo_path.is_dir():
        return 0

    restored = 0
    for fname in ARTIFACT_REGISTRY:
        dest = data_path / fname
        src = demo_path / fname
        if not src.is_file():
            continue
        # Stock price files use a two-line header; require several body rows.
        min_rows = 4 if fname.startswith("stock_prices_") else 1
        if csv_has_data_rows(dest, min_rows=min_rows):
            continue
        shutil.copy2(src, dest)
        restored += 1
    return restored
