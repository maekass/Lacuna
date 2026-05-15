"""
Canonical disease registry: ontology anchors, artifact names, trial queries, equity context.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator


@dataclass(frozen=True)
class DiseaseSpec:
    disease_id: str
    code: str
    display_name: str
    clinical_trials_query: str
    disparity_note: str
    mesh_id: str
    mesh_label: str
    snomed_id: str
    snomed_label: str
    icd10_code: str
    icd10_label: str
    prevalence_us: int
    search_terms: tuple[str, ...]
    companies: dict[str, str]
    openfda_query: str

    @property
    def trials_artifact(self) -> str:
        return f"clinical_trials_{self.disease_id}.csv"

    @property
    def epidemiology_artifact(self) -> str:
        if self.disease_id == "scd":
            return "cdc_sickle_cell_data.csv"
        return f"epidemiology_{self.disease_id}.csv"

    @property
    def pipeline_artifact(self) -> str:
        if self.disease_id == "scd":
            return "gene_therapy_pipeline_scd.csv"
        return f"pipeline_{self.disease_id}.csv"

    @property
    def fda_artifact(self) -> str:
        return f"fda_approvals_{self.disease_id}.csv"

    @property
    def prevalence_column(self) -> str:
        if self.disease_id == "scd":
            return "scd_prevalence_us"
        return "prevalence_us"

    def health_artifacts(self) -> list[str]:
        return [self.epidemiology_artifact, self.trials_artifact, self.pipeline_artifact, self.fda_artifact]


DISEASES: dict[str, DiseaseSpec] = {
    "scd": DiseaseSpec(
        disease_id="scd",
        code="SCD",
        display_name="Sickle Cell Disease",
        clinical_trials_query="sickle cell disease",
        disparity_note=(
            "In the U.S., sickle cell disease disproportionately affects people of African ancestry; "
            "SCD occurs in roughly 1 in 365 Black or African-American births (CDC)."
        ),
        mesh_id="D000755",
        mesh_label="Anemia, Sickle Cell",
        snomed_id="417357006",
        snomed_label="Sickle cell anemia",
        icd10_code="D57.1",
        icd10_label="Sickle-cell disease without crisis",
        prevalence_us=118_000,
        search_terms=("sickle cell disease", "sickle cell anemia", "hemoglobin S"),
        companies={
            "CRISPR Therapeutics": "CRSP",
            "Vertex Pharmaceuticals": "VRTX",
            "Beam Therapeutics": "BEAM",
            "Intellia Therapeutics": "NTLA",
            "Editas Medicine": "EDIT",
            "Novartis": "NVS",
            "Pfizer": "PFE",
            "Bristol Myers Squibb": "BMY",
            "Emmaus Life Sciences": "EMMS",
            "Sangamo Therapeutics": "SGMO",
        },
        openfda_query="sickle cell",
    ),
    "sle": DiseaseSpec(
        disease_id="sle",
        code="SLE",
        display_name="Systemic Lupus Erythematosus",
        clinical_trials_query="systemic lupus erythematosus",
        disparity_note=(
            "Black women have roughly three times the incidence of SLE versus white women in the U.S. "
            "and often experience more severe disease — a core immunology equity focus."
        ),
        mesh_id="D008180",
        mesh_label="Lupus Erythematosus, Systemic",
        snomed_id="55464009",
        snomed_label="Systemic lupus erythematosus",
        icd10_code="M32.10",
        icd10_label="Systemic lupus erythematosus, organ/system involvement unspecified",
        prevalence_us=200_000,
        search_terms=("systemic lupus erythematosus", "lupus", "SLE"),
        companies={
            "GSK": "GSK",
            "AstraZeneca": "AZN",
            "Eli Lilly": "LLY",
            "Bristol Myers Squibb": "BMY",
            "Biogen": "BIIB",
            "Johnson & Johnson": "JNJ",
            "Immunovant": "IMVT",
            "Cabaletta Bio": "CABA",
        },
        openfda_query="systemic lupus erythematosus",
    ),
    "sarc": DiseaseSpec(
        disease_id="sarc",
        code="SARCOID",
        display_name="Sarcoidosis",
        clinical_trials_query="sarcoidosis",
        disparity_note=(
            "In the U.S., sarcoidosis incidence and severity are higher among Black women than many other groups; "
            "pulmonary and multi-organ involvement drive morbidity."
        ),
        mesh_id="D012507",
        mesh_label="Sarcoidosis",
        snomed_id="31541009",
        snomed_label="Sarcoidosis",
        icd10_code="D86.9",
        icd10_label="Sarcoidosis, unspecified",
        prevalence_us=150_000,
        search_terms=("sarcoidosis", "pulmonary sarcoidosis"),
        companies={
            "Novartis": "NVS",
            "Insmed": "INSM",
            "aTyr Pharma": "LIFE",
            "Johnson & Johnson": "JNJ",
        },
        openfda_query="sarcoidosis",
    ),
}


def us_tickers(companies: dict[str, str]) -> dict[str, str]:
    """Keep liquid US symbols for yfinance (drop dotted foreign listings)."""
    return {n: t for n, t in companies.items() if t and "." not in t and t.upper() == t}


def union_us_tickers() -> dict[str, str]:
    out: dict[str, str] = {}
    for spec in list_diseases():
        for name, ticker in us_tickers(spec.companies).items():
            out[name] = ticker
    return out

FOCUS_DISEASE_IDS: tuple[str, ...] = ("scd", "sle", "sarc")


def list_diseases() -> list[DiseaseSpec]:
    return [DISEASES[did] for did in FOCUS_DISEASE_IDS]


def get_disease(disease_id: str) -> DiseaseSpec:
    return DISEASES.get(disease_id, DISEASES["scd"])


def all_artifact_names() -> Iterator[str]:
    seen: set[str] = set()
    for spec in list_diseases():
        for name in spec.health_artifacts():
            if name not in seen:
                seen.add(name)
                yield name
