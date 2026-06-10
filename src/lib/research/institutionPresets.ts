/**
 * ClinicalTrials.gov sponsor presets for domestic research hubs.
 * Used by the live trial search panel — separate from Postgres `study_trial_links`.
 */

export interface InstitutionTrialPreset {
  id: string;
  label: string;
  sponsor: string;
  condition: string;
  description: string;
}

export const DOMESTIC_TRIAL_PRESETS: readonly InstitutionTrialPreset[] = [
  {
    id: "nih-womens-health",
    label: "NIH Women's Health",
    sponsor:
      "Eunice Kennedy Shriver National Institute of Child Health and Human Development",
    condition: "women reproductive PCOS fertility maternal",
    description:
      "NICHD-sponsored trials — PCOS, fertility, maternal health, reproductive endocrinology",
  },
  {
    id: "nih-cancer",
    label: "NIH Cancer (NCI)",
    sponsor: "National Cancer Institute",
    condition: "breast ovarian cervical hereditary cancer BRCA",
    description:
      "NCI trials — breast/ovarian cancer, hereditary cancer, genomic screening",
  },
  {
    id: "nih-scd",
    label: "NIH Sickle Cell",
    sponsor: "National Heart, Lung, and Blood Institute",
    condition: "sickle cell anemia hemoglobinopathy",
    description: "NHLBI sickle cell disease and gene therapy trials",
  },
  {
    id: "harvard-affiliates",
    label: "Harvard Affiliates",
    sponsor: "Harvard",
    condition: "women breast PCOS lupus genetics",
    description:
      "Harvard Medical School affiliates — BWH, MGH, Dana-Farber, Chan School cohorts",
  },
  {
    id: "bwh",
    label: "Brigham & Women's",
    sponsor: "Brigham and Women's Hospital",
    condition: "hereditary cancer BRCA breast ovarian",
    description: "BWH hereditary cancer and women's health trials",
  },
  {
    id: "mgh",
    label: "Mass General",
    sponsor: "Massachusetts General Hospital",
    condition: "PCOS endometriosis fertility reproductive",
    description: "MGH reproductive endocrine and fertility trials",
  },
  {
    id: "dana-farber",
    label: "Dana-Farber",
    sponsor: "Dana-Farber Cancer Institute",
    condition: "breast cancer triple negative hereditary",
    description: "DFCI breast oncology and precision medicine trials",
  },
  {
    id: "broad-mit-harvard",
    label: "Broad (MIT/Harvard)",
    sponsor: "Broad Institute",
    condition: "genomics cancer precision medicine biomarker",
    description:
      "Broad Institute of MIT and Harvard — genomics, cancer dependencies, biomarkers",
  },
] as const;
