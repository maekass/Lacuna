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
    orpha_code: int
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
        orpha_code=232,
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
        orpha_code=536,
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
        orpha_code=797,
        search_terms=("sarcoidosis", "pulmonary sarcoidosis"),
        companies={
            "Novartis": "NVS",
            "Insmed": "INSM",
            "aTyr Pharma": "LIFE",
            "Johnson & Johnson": "JNJ",
        },
        openfda_query="sarcoidosis",
    ),
    "fibroids": DiseaseSpec(
        disease_id="fibroids",
        code="FIB",
        display_name="Uterine Fibroids",
        clinical_trials_query="uterine fibroids",
        disparity_note=(
            "Uterine fibroids disproportionately affect Black women, with 80% developing fibroids by age 50 "
            "(vs 70% of white women). Black women develop fibroids earlier, have larger/more numerous fibroids, "
            "and experience more severe symptoms — a $34 billion market opportunity with significant health equity impact."
        ),
        mesh_id="D007889",
        mesh_label="Leiomyoma",
        snomed_id="95347000",
        snomed_label="Uterine fibroids",
        icd10_code="D25.9",
        icd10_label="Leiomyoma of uterus, unspecified",
        prevalence_us=26_000_000,  # 26M women affected
        orpha_code=91387,
        search_terms=("uterine fibroids", "leiomyoma", "fibroids"),
        companies={
            "Myovant Sciences": "MYOV",
            "AbbVie": "ABBV",
            "Pfizer": "PFE",
            "Bayer": "BAYRY",
            "Merck": "MRK",
            "Gynecologic Oncology Group": "NR",
        },
        openfda_query="uterine fibroids",
    ),
    "tnbc": DiseaseSpec(
        disease_id="tnbc",
        code="TNBC",
        display_name="Triple-Negative Breast Cancer",
        clinical_trials_query="triple negative breast cancer",
        disparity_note=(
            "Triple-negative breast cancer is 2-3x more common in Black women and has worse outcomes. "
            "TNBC lacks targeted therapies (ER/PR/HER2 negative), making it an urgent unmet need "
            "with significant immunotherapy and ADC development activity."
        ),
        mesh_id="D058413",
        mesh_label="Carcinoma, Triple Negative Breast",
        snomed_id="712491000",
        snomed_label="Triple-negative breast cancer",
        icd10_code="C50.919",
        icd10_label="Malignant neoplasm of unspecified site of unspecified female breast",
        prevalence_us=40_000,  # Annual new cases
        orpha_code=227535,
        search_terms=("triple negative breast cancer", "TNBC", "basal-like breast cancer"),
        companies={
            "Gilead Sciences": "GILD",
            "Merck": "MRK",
            "Roche": "RHHBY",
            "AstraZeneca": "AZN",
            "Bristol Myers Squibb": "BMY",
            "Pfizer": "PFE",
            "Immunomedics": "GILD",
            "Seagen": "PFE",
        },
        openfda_query="triple negative breast cancer",
    ),
    "lupus_nephritis": DiseaseSpec(
        disease_id="lupus_nephritis",
        code="SLE-N",
        display_name="Lupus Nephritis",
        clinical_trials_query="lupus nephritis",
        disparity_note=(
            "Lupus nephritis is a severe kidney complication of SLE that disproportionately affects Black women. "
            "60% of SLE patients develop nephritis; Black patients have higher incidence, worse outcomes, "
            "and faster progression to end-stage renal disease — a critical immunology equity target."
        ),
        mesh_id="D008180",
        mesh_label="Lupus Nephritis",
        snomed_id="85634009",
        snomed_label="Lupus nephritis",
        icd10_code="M32.14",
        icd10_label="Systemic lupus erythematosus with organ/system involvement",
        prevalence_us=120_000,  # 60% of SLE patients
        orpha_code=536,
        search_terms=("lupus nephritis", "SLE nephritis", "lupus kidney"),
        companies={
            "Aurinia Pharmaceuticals": "AUPH",
            "GSK": "GSK",
            "Eli Lilly": "LLY",
            "Bristol Myers Squibb": "BMY",
            "Novartis": "NVS",
            "Roche": "RHHBY",
            "Biogen": "BIIB",
        },
        openfda_query="lupus nephritis",
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

FOCUS_DISEASE_IDS: tuple[str, ...] = ("scd", "sle", "sarc", "fibroids", "tnbc", "lupus_nephritis")


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
