#!/usr/bin/env python3
"""Generate offline training seed when ClinicalTrials.gov fetch is unavailable."""

from __future__ import annotations

import json
import random
from pathlib import Path

random.seed(42)

WH_TEMPLATES = [
    ("Phase {p} Study of {drug} for Endometriosis Pain", "Endometriosis", "Gynecology Pharma", "industry"),
    ("{drug} for Polycystic Ovary Syndrome: A Randomized Trial", "Polycystic Ovary Syndrome", "Repro Health Inc", "industry"),
    ("Maternal Health Monitoring With {drug} in Pregnancy", "Pregnancy", "Maternal Digital Co", "industry"),
    ("IVF Culture Media {drug} Efficacy Study", "Infertility", "Fertility Labs", "industry"),
    ("Postpartum Depression Treatment With {drug}", "Postpartum Depression", "Mindful Maternal", "industry"),
    ("Non-Hormonal Contraception Device {drug}", "Contraception", "Cadence Research", "industry"),
    ("Pelvic Floor Rehabilitation for Urinary Incontinence", "Urinary Incontinence", "Pelvic Therapeutics", "industry"),
    ("Ovarian Cancer Biomarker {drug} Validation", "Ovarian Cancer", "Oncology Dx", "industry"),
    ("Menopause Vasomotor Symptoms: {drug} Trial", "Menopause", "Menopause Care", "industry"),
    ("Preterm Birth Prevention With Cervical Device", "Preterm Birth", "Novocuff Research", "industry"),
    ("University Hospital PCOS Lifestyle Intervention", "Polycystic Ovary Syndrome", "State University Medical Center", "academic"),
]

NEG_TEMPLATES = [
    ("Phase {p} {drug} for Type 2 Diabetes", "Type 2 Diabetes Mellitus", "Metabolic Pharma", "industry"),
    ("Hypertension Control With {drug}", "Hypertension", "Cardio Corp", "industry"),
    ("Atrial Fibrillation Ablation Outcomes", "Atrial Fibrillation", "Electrophysiology Inc", "industry"),
    ("COPD Exacerbation Prevention Study", "Chronic Obstructive Pulmonary Disease", "Respiratory Co", "industry"),
    ("Rheumatoid Arthritis {drug} Efficacy", "Rheumatoid Arthritis", "Immuno Therapeutics", "industry"),
    ("Psoriasis Topical {drug} Trial", "Psoriasis", "Derm Pharma", "industry"),
    ("Hepatitis C Antiviral {drug}", "Hepatitis C", "Virology Labs", "industry"),
    ("Chronic Kidney Disease Progression", "Chronic Kidney Disease", "Nephro Research", "industry"),
]

DRUGS = ["LP-101", "MTX-440", "AB-22", "XR-908", "NEU-55", "CV-712"]
PHASES = ["PHASE1", "PHASE2", "PHASE3"]
STATUSES = [
    ("COMPLETED", 0, 1),
    ("RECRUITING", 0, None),
    ("ACTIVE_NOT_RECRUITING", 0, None),
    ("TERMINATED", 1, 0),
    ("WITHDRAWN", 1, 0),
]


def pick_status() -> tuple[str, int, int | None]:
    status, term, comp = random.choice(STATUSES)
    # Add label noise ~8% flip for realism
    if comp is not None and random.random() < 0.08:
        comp = 1 - comp
    if random.random() < 0.05:
        term = 1 - term
    return status, term, comp


def synth_records(n_wh: int = 600, n_neg: int = 600) -> list[dict]:
    records: list[dict] = []
    idx = 0

    for _ in range(n_wh):
        tpl, cond, sponsor, sponsor_class = random.choice(WH_TEMPLATES)
        drug = random.choice(DRUGS)
        phase = random.choice(PHASES)
        status, term, comp = pick_status()
        title = tpl.format(p=phase.replace("PHASE", " "), drug=drug)
        year = random.randint(2012, 2024)
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
                "label_terminated": term,
                "label_completed": comp,
                "has_results": random.random() < 0.35,
                "study_type": "INTERVENTIONAL",
                "start_year": year,
                "sponsor_class": sponsor_class,
                "source_query": cond.lower(),
            }
        )
        idx += 1

    for _ in range(n_neg):
        tpl, cond, sponsor, sponsor_class = random.choice(NEG_TEMPLATES)
        drug = random.choice(DRUGS)
        phase = random.choice(PHASES)
        status, term, comp = pick_status()
        title = tpl.format(p=phase.replace("PHASE", " "), drug=drug)
        year = random.randint(2012, 2024)
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
                "label_terminated": term,
                "label_completed": comp,
                "has_results": random.random() < 0.25,
                "study_type": "INTERVENTIONAL",
                "start_year": year,
                "sponsor_class": sponsor_class,
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
