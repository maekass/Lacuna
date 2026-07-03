"""Women's health trial labeling constants — aligned with Lacuna SEC keyword list."""

WH_CONDITION_QUERIES: tuple[str, ...] = (
    "endometriosis",
    "polycystic ovary syndrome",
    "uterine fibroids",
    "preeclampsia",
    "postpartum depression",
    "menopause",
    "ovarian cancer",
    "cervical cancer",
    "breast cancer women's health",
    "contraception",
    "infertility",
    "in vitro fertilization",
    "pelvic floor",
    "vaginal microbiome",
    "preterm birth",
)

NEGATIVE_CONDITION_QUERIES: tuple[str, ...] = (
    "type 2 diabetes",
    "hypertension",
    "atrial fibrillation",
    "chronic kidney disease",
    "COPD",
    "rheumatoid arthritis",
    "psoriasis",
    "hepatitis C",
)

WH_KEYWORDS: frozenset[str] = frozenset(
    kw.lower()
    for kw in (
        "women's health",
        "womens health",
        "female",
        "fertility",
        "infertility",
        "ivf",
        "ob-gyn",
        "obgyn",
        "gynecolog",
        "maternal",
        "maternity",
        "prenatal",
        "postpartum",
        "menopause",
        "menstrual",
        "contraception",
        "birth control",
        "pelvic",
        "endometriosis",
        "pcos",
        "uterine",
        "fibroid",
        "ovarian",
        "breast",
        "lactation",
        "reproductive",
        "pregnancy",
        "femtech",
    )
)

TERMINATED_STATUSES: frozenset[str] = frozenset(
    {"TERMINATED", "WITHDRAWN", "SUSPENDED"}
)

ACTIVE_OR_COMPLETED_STATUSES: frozenset[str] = frozenset(
    {
        "COMPLETED",
        "RECRUITING",
        "ACTIVE_NOT_RECRUITING",
        "ENROLLING_BY_INVITATION",
        "NOT_YET_RECRUITING",
    }
)

PHASE_TO_NUM: dict[str, float] = {
    "EARLY_PHASE1": 0.5,
    "PHASE1": 1.0,
    "PHASE2": 2.0,
    "PHASE3": 3.0,
    "PHASE4": 4.0,
    "NA": 0.0,
    "Not Applicable": 0.0,
}
