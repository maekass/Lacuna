"""
Write data/raw/data_manifest.json: per-artifact kind (sourced vs illustrative) and last_modified_utc.
Call after collection and after market_analysis writes CSVs.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# kind: illustrative | sourced_public | sourced_public_delayed
ARTIFACT_REGISTRY: dict[str, dict[str, str]] = {
    "cdc_sickle_cell_data.csv": {
        "kind": "illustrative",
        "summary": "Generated time series in code; not a live CDC API extract. Replace with cited agency data.",
    },
    "clinical_trials_scd.csv": {
        "kind": "sourced_public",
        "summary": "ClinicalTrials.gov (legacy JSON and/or v2 REST). Query and API version affect coverage.",
    },
    "fda_approvals_scd.csv": {
        "kind": "illustrative",
        "summary": "Hand-built example rows for scaffolding; not an automated openFDA pull.",
    },
    "gene_therapy_pipeline_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative pipeline table for demos; verify against company filings and trials.",
    },
    "stock_prices_companies.csv": {
        "kind": "sourced_public_delayed",
        "summary": "Yahoo Finance via yfinance; delayed per vendor terms.",
    },
    "stock_prices_etfs.csv": {
        "kind": "sourced_public_delayed",
        "summary": "Yahoo Finance via yfinance; delayed per vendor terms.",
    },
    "company_financials.csv": {
        "kind": "sourced_public_delayed",
        "summary": "yfinance ticker info snapshot; delayed / vendor-defined fields.",
    },
    "vc_deals_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative private-market table; not PitchBook/Crunchbase.",
    },
    "growth_equity_deals_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative private-market table; not licensed deal data.",
    },
    "public_equity_companies_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative cross-section for stage analysis demos.",
    },
    "stage_returns_analysis.csv": {
        "kind": "illustrative",
        "summary": "Illustrative stage return parameters for demos.",
    },
    "precision_medicine_pipeline.csv": {
        "kind": "illustrative",
        "summary": "Illustrative precision-medicine rows for demos.",
    },
    "market_size_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative TAM-style rows until replaced with sourced market research.",
    },
    "large_pharma_investments_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative pharma positioning table.",
    },
    "competitive_landscape_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative competitive snapshot.",
    },
    "deal_flow_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative deal timeline; not a comprehensive M&A database.",
    },
    "regulatory_landscape_scd.csv": {
        "kind": "illustrative",
        "summary": "Illustrative regulatory summary rows.",
    },
    "investment_attractiveness_scd.csv": {
        "kind": "illustrative",
        "summary": "Demo scoring weights only; not ratings or recommendations.",
    },
}


def write_data_manifest(data_dir: str | Path, trigger: str = "unknown") -> Path:
    """Scan registered artifacts on disk and write data_manifest.json."""
    data_dir = Path(data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc).isoformat()
    artifacts: dict[str, Any] = {}
    for fname, meta in ARTIFACT_REGISTRY.items():
        path = data_dir / fname
        entry = {
            "kind": meta["kind"],
            "source_summary": meta["summary"],
            "present": path.exists(),
        }
        if path.exists():
            entry["last_modified_utc"] = datetime.fromtimestamp(
                path.stat().st_mtime, tz=timezone.utc
            ).isoformat()
        artifacts[fname] = entry

    payload = {
        "manifest_version": 1,
        "last_manifest_write_utc": now,
        "trigger": trigger,
        "artifacts": artifacts,
    }
    out_path = data_dir / "data_manifest.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"✓ Data manifest written to {out_path}")
    return out_path


def kind_display_label(kind: str) -> str:
    return {
        "illustrative": "Illustrative",
        "sourced_public": "Sourced (public)",
        "sourced_public_delayed": "Sourced (public, delayed vendor)",
    }.get(kind, kind)
