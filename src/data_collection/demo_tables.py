"""Illustrative health tables for demo bundle and offline collection."""

from __future__ import annotations

import pandas as pd

from src.data_collection.parsers.epidemiology_series import build_epidemiology_dataframe
from src.disease_registry import get_disease

# Illustrative Orphanet U.S. point-prevalence rates (per 100k) for offline demo bundle.
_DEMO_ORPHANET_US_PER_100K = {"scd": 30.0, "sle": 53.6, "sarc": 60.0}


def epidemiology_df(disease_id: str) -> pd.DataFrame:
    """Offline epidemiology rows using cited anchors (no network)."""
    spec = get_disease(disease_id)
    rate = _DEMO_ORPHANET_US_PER_100K.get(disease_id)
    return build_epidemiology_dataframe(spec, us_prevalence_per_100k=rate, trials=None)


def pipeline_sle() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "company": ["AstraZeneca", "GSK", "Eli Lilly", "Biogen", "Immunovant", "Cabaletta Bio"],
            "ticker": ["AZN", "GSK", "LLY", "BIIB", "IMVT", "CABA"],
            "asset_name": ["Anifrolumab", "Belimumab", "Baricitinib", "Litifilimab", "IMVT-1401", "CABA-201"],
            "technology": ["Type I IFN inhibitor", "BLyS inhibitor", "JAK inhibitor", "Anti-BDCA2", "FcRn inhibitor", "CAR-T"],
            "clinical_phase": ["Commercial", "Commercial", "Commercial", "Phase 2", "Phase 2", "Phase 1/2"],
            "target_mechanism": [
                "Interferon pathway",
                "B-cell modulation",
                "JAK-STAT",
                "Monoclonal antibody",
                "IgG recycling",
                "CD19 CAR-T",
            ],
            "probability_of_success": [0.75, 0.70, 0.65, 0.45, 0.40, 0.35],
            "estimated_cost": [120000, 95000, 80000, 150000, 110000, 450000],
            "disease_id": "sle",
        }
    )


def pipeline_sarc() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "company": ["Novartis", "aTyr Pharma", "Insmed", "Kinevant Sciences"],
            "ticker": ["NVS", "LIFE", "INSM", "N/A"],
            "asset_name": ["Secukinumab", "ATYR1923", "Brensocatib", "Namilumab"],
            "technology": ["IL-17 inhibitor", "tRNA synthetase", "DPP1 inhibitor", "GM-CSF inhibitor"],
            "clinical_phase": ["Phase 2", "Phase 1/2", "Phase 3", "Phase 2"],
            "target_mechanism": ["IL-17 pathway", "Immune resolution", "Neutrophil serine protease", "Macrophage axis"],
            "probability_of_success": [0.35, 0.30, 0.50, 0.40],
            "estimated_cost": [90000, 75000, 95000, 85000],
            "disease_id": "sarc",
        }
    )


def pipeline_scd() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "company": ["CRISPR Therapeutics", "Vertex Pharmaceuticals", "Editas Medicine"],
            "ticker": ["CRSP", "VRTX", "EDIT"],
            "gene_therapy_name": ["CTX001", "CTX001", "EDIT-301"],
            "technology": ["CRISPR-Cas9", "CRISPR-Cas9", "CRISPR-Cas9"],
            "clinical_phase": ["Phase 3", "Phase 3", "Phase 1/2"],
            "target_mechanism": ["BCL11A disruption", "BCL11A disruption", "BCL11A disruption"],
            "probability_of_success": [0.80, 0.80, 0.45],
            "estimated_cost": [1_850_000, 1_850_000, 1_950_000],
        }
    )


def fda_sle() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "drug_name": ["Belimumab", "Anifrolumab", "Baricitinib", "Voclosporin"],
            "company": ["GSK", "AstraZeneca", "Eli Lilly", "Aurinia"],
            "approval_date": ["2011-03-09", "2021-07-30", "2023-08-14", "2021-01-22"],
            "mechanism": ["Monoclonal antibody", "Type I IFN inhibitor", "JAK inhibitor", "Calcineurin inhibitor"],
            "phase": ["Commercial"] * 4,
            "efficacy": ["Reduces SLE flares", "Skin and organ response", "Lupus nephritis adjunct", "Lupus nephritis"],
            "disease_id": "sle",
        }
    )


def fda_sarc() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "drug_name": ["Prednisone (standard)", "Methotrexate", "Infliximab (off-label)"],
            "company": ["Generic", "Generic", "JNJ"],
            "approval_date": ["—", "—", "—"],
            "mechanism": ["Corticosteroid", "Antimetabolite", "TNF inhibitor"],
            "phase": ["Commercial", "Commercial", "Off-label"],
            "efficacy": ["Symptom control", "Steroid-sparing", "Refractory sarcoidosis"],
            "disease_id": "sarc",
        }
    )


def fda_scd() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "drug_name": ["L-glutamine", "Voxelotor", "Crizanlizumab"],
            "company": ["Emmaus Life Sciences", "Pfizer", "Novartis"],
            "approval_date": ["2017-07-07", "2019-11-25", "2019-11-15"],
            "mechanism": ["Antioxidant", "HbS polymerization inhibitor", "P-selectin inhibitor"],
            "phase": ["Commercial"] * 3,
            "efficacy": ["Reduces pain crises", "Increases hemoglobin", "Reduces pain crises"],
        }
    )
