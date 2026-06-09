/**
 * ClinicalTrials.gov sponsor presets for domestic research hubs.
 * Used by the live trial search panel — separate from Postgres `study_trial_links`.
 */

export interface InstitutionTrialPreset {
  id: string;
  label: string;
  sponsor?: string;
  condition: string;
  description: string;
}

export const DOMESTIC_TRIAL_PRESETS: readonly InstitutionTrialPreset[] = [
  {
    id: "womens-health-market",
    label: "Women's Health Market",
    condition:
      "endometriosis infertility fertility pregnancy postpartum menopause uterine fibroids PCOS",
    description:
      "Broad market scan — fertility, pelvic pain, maternal health, menopause, and reproductive endocrinology",
  },
  {
    id: "nih-womens-health",
    label: "NIH Women's Health",
    sponsor:
      "Eunice Kennedy Shriver National Institute of Child Health and Human Development",
    condition: "endometriosis infertility fertility pregnancy maternal reproductive",
    description:
      "NICHD trials — reproductive endocrinology, fertility, maternal health, and pregnancy",
  },
  {
    id: "nih-cancer",
    label: "NIH Cancer (NCI)",
    sponsor: "National Cancer Institute",
    condition: "breast ovarian cervical endometrial BRCA cancer",
    description:
      "NCI trials — breast and gynecologic oncology, hereditary cancer, genomic screening",
  },
  {
    id: "pelvic-pain-endometriosis",
    label: "Pelvic Pain & Endometriosis",
    condition: "endometriosis pelvic pain adenomyosis uterine fibroids",
    description:
      "Live pelvic health scan — endometriosis, adenomyosis, chronic pelvic pain, and fibroids",
  },
  {
    id: "fertility-pcos",
    label: "Fertility & PCOS",
    condition: "PCOS infertility fertility ovulation reproductive",
    description:
      "Fertility landscape — PCOS, infertility, ovulatory disorders, and reproductive endocrinology",
  },
  {
    id: "maternal-health",
    label: "Maternal Health",
    condition: "pregnancy postpartum preeclampsia gestational maternal",
    description:
      "Maternal health scan — pregnancy, postpartum care, hypertensive disorders, and gestational complications",
  },
  {
    id: "menopause-aging",
    label: "Menopause & Aging",
    condition: "menopause vasomotor osteoporosis women",
    description:
      "Menopause and healthy aging — vasomotor symptoms, bone health, and midlife women",
  },
  {
    id: "precision-genomics",
    label: "Precision Genomics",
    condition: "BRCA hereditary genomic biomarker precision oncology screening",
    description:
      "Precision medicine scan — biomarkers, hereditary screening, BRCA, and genomic oncology",
  },
  {
    id: "bwh",
    label: "Brigham & Women's",
    sponsor: "Brigham and Women's Hospital",
    condition: "endometriosis fertility reproductive breast women",
    description:
      "BWH live sponsor feed — women's health, fertility, pelvic pain, and breast disease",
  },
  {
    id: "mgh",
    label: "Mass General",
    sponsor: "Massachusetts General Hospital",
    condition: "fertility infertility endometriosis reproductive",
    description: "MGH reproductive endocrine, infertility, and pelvic care trials",
  },
  {
    id: "dana-farber",
    label: "Dana-Farber",
    sponsor: "Dana-Farber Cancer Institute",
    condition: "breast ovarian BRCA hereditary cancer",
    description:
      "DFCI precision oncology feed — breast and ovarian cancer, BRCA, and hereditary risk",
  },
  {
    id: "nih-scd",
    label: "NIH Sickle Cell",
    sponsor: "National Heart, Lung, and Blood Institute",
    condition: "sickle cell anemia hemoglobinopathy",
    description: "NHLBI sickle cell disease and gene therapy trials",
  },
] as const;
