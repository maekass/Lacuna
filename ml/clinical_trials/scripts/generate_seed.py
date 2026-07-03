#!/usr/bin/env python3
"""Generate offline training seed when ClinicalTrials.gov fetch is unavailable."""

from __future__ import annotations

import json
import random
from pathlib import Path

from lacuna_ct.constants import WH_KEYWORDS

random.seed(42)

WH_TEMPLATES = [
    ("Phase {p} Study of {drug} for Endometriosis Pain", "Endometriosis", "Gynecology Pharma"),
    ("{drug} for Polycystic Ovary Syndrome: A Randomized Trial", "Polycystic Ovary Syndrome", "Repro Health Inc"),
    ("Maternal Health Monitoring With {drug} in Pregnancy", "Pregnancy", "Maternal Digital Co"),
    ("IVF Culture Media {drug} Efficacy Study", "Infertility", "Fertility Labs"),
    ("Postpartum Depression Treatment With {drug}", "Postpartum Depression", "Mindful Maternal"),
    ("Non-Hormonal Contraception Device {drug}", "Contraception", "Cadence Research"),
    ("Pelvic Floor Rehabilitation for Urinary Incontinence", "Urinary Incontinence", "Pelvic Therapeutics"),
    ("Ovarian Cancer Biomarker {drug} Validation", "Ovarian Cancer", "Oncology Dx"),
    ("Menopause Vasomotor Symptoms: {drug} Trial", "Menopause", "Menopause Care"),
    ("Preterm Birth Prevention With Cervical Device", "Preterm Birth", "Novocuff Research"),
]

NEG_TEMPLATES = [
    ("Phase {p} {drug} for Type 2 Diabetes", "Type 2 Diabetes Mellitus", "Metabolic Pharma"),
    ("Hypertension Control With {drug}", "Hypertension", "Cardio Corp"),
    ("Atrial Fibrillation Ablation Outcomes", "Atrial Fibrillation", "Electrophysiology Inc"),
    ("COPD Exacerbation Prevention Study", "Chronic Obstructive Pulmonary Disease", "Respiratory Co"),
    ("Rheumatoid Arthritis {drug} Efficacy", "Rheumatoid Arthritis", "Immuno Therapeutics"),
    ("Psoriasis Topical {drug} Trial", "Psoriasis", "Derm Pharma"),
    ("Hepatitis C Antiviral {drug}", "Hepatitis C", "Virology Labs"),
    ("Chronic Kidney Disease Progression", "Chronic Kidney Disease", "Nephro Research"),
]

DRUGS = ["LP-101", "MTX-440", "AB-22", "XR-908", "NEU-55", "CV-712"]
PHASES = ["PHASE1", "PHASE2", "PHASE3"]
STATUSES_POS = ["COMPLETED", "RECRUITING", "ACTIVE_NOT_RECRUITING", "TERMINATED", "WITHDRAWN"]


def synth_records(n_wh: int = 220, n_neg: int = 220) -> list[dict]:
    records: list[dict] = []
    idx = 0

    for _ in range(n_wh):
        tpl, cond, sponsor = random.choice(WH_TEMPLATES)
        drug = random.choice(DRUGS)
        phase = random.choice(PHASES)
        status = random.choice(STATUSES_POS)
        title = tpl.format(p=phase.replace("PHASE", " "), drug=drug)
        terminated = 1 if status in {"TERMINATED", "WITHDRAWN"} else 0
        records.append(
            {
                "nct_id": f"NCTSEED{idx:05d}",
                "title": title,
                "phase": phase,
                "status": status,
                "condition": cond,
                "sponsor": sponsor,
                "enrollment": random.randint(30, 1200),
                "interventions": f"{drug}, placebo",
                "label_wh": 1,
                "label_terminated": terminated,
                "source_query": cond.lower(),
            }
        )
        idx += 1

    for _ in range(n_neg):
        tpl, cond, sponsor = random.choice(NEG_TEMPLATES)
        drug = random.choice(DRUGS)
        phase = random.choice(PHASES)
        status = random.choice(STATUSES_POS)
        title = tpl.format(p=phase.replace("PHASE", " "), drug=drug)
        # Ensure no accidental WH keyword overlap in negatives
        if any(kw in title.lower() or kw in cond.lower() for kw in WH_KEYWORDS):
            continue
        terminated = 1 if status in {"TERMINATED", "WITHDRAWN"} else 0
        records.append(
            {
                "nct_id": f"NCTSEED{idx:05d}",
                "title": title,
                "phase": phase,
                "status": status,
                "condition": cond,
                "sponsor": sponsor,
                "enrollment": random.randint(30, 1200),
                "interventions": f"{drug}, standard of care",
                "label_wh": 0,
                "label_terminated": terminated,
                "source_query": cond.lower(),
            }
        )
        idx += 1

    return records


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "data" / "training_seed.json"
    records = synth_records()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Wrote {len(records)} seed records → {out}")


if __name__ == "__main__":
    main()
