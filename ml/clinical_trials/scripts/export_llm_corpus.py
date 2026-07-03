#!/usr/bin/env python3
"""
Export instruction-tuning JSONL for a future women's-health clinical trials LLM.

Does NOT train a model — prepares (input, output) pairs from cached trial records.

Usage:
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/export_llm_corpus.py
"""

from __future__ import annotations

import json
from pathlib import Path

from lacuna_ct.fetch_training_data import load_cached_records, load_seed_records


def trial_summary_instruction(record) -> dict:
    input_json = {
        "nct_id": record.nct_id,
        "title": record.title,
        "phase": record.phase,
        "status": record.status,
        "condition": record.condition,
        "sponsor": record.sponsor,
        "enrollment": record.enrollment,
        "interventions": record.interventions,
        "has_results": record.has_results,
    }
    output = (
        f"Trial {record.nct_id} in {record.condition} is {record.status} "
        f"({record.phase}, enrollment {record.enrollment}). "
        f"Sponsor: {record.sponsor}. "
        f"Women's-health portfolio relevance label: {record.label_wh}. "
        f"This is educational metadata from ClinicalTrials.gov — not clinical advice."
    )
    return {
        "instruction": (
            "Summarize this clinical trial for a women's health research educator. "
            "Use only the JSON fields provided. Do not invent endpoints or results."
        ),
        "input": json.dumps(input_json),
        "output": output,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    cache = root / "ml/clinical_trials/data/cached_training.json"
    out = root / "ml/clinical_trials/data/llm_corpus.jsonl"

    if cache.exists():
        records = load_cached_records(cache)
    else:
        records = load_seed_records()

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as fh:
        for record in records[:2000]:
            fh.write(json.dumps(trial_summary_instruction(record)) + "\n")

    print(f"Wrote {min(len(records), 2000)} JSONL rows → {out}")


if __name__ == "__main__":
    main()
