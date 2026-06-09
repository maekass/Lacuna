/**
 * Curated US domestic research studies with published sample sizes.
 * Educational metadata — not live enrollment feeds. Sources cited per row.
 */

export type DomesticInstitution =
  | "nih"
  | "harvard"
  | "mit"
  | "harvard_mit_collab";

export type StudyDataTier = "cited_public" | "illustrative_static";

export interface DomesticResearchStudy {
  studyId: string;
  title: string;
  institution: DomesticInstitution;
  institutionLabel: string;
  sampleSize: number;
  sampleSizeNote: string;
  conditions: readonly string[];
  markerGenes: readonly string[];
  geography: "US";
  dataTier: StudyDataTier;
  source: string;
  sourceYear: number;
  /** Optional link to variant-store callset for local demo */
  variantCallsetId?: string;
  /** ClinicalTrials.gov sponsor filter for live cross-reference */
  clinicalTrialsSponsor?: string;
}

/**
 * Representative ClinicalTrials.gov registry IDs per study (public citations).
 * Observational cohorts without interventional trials are omitted.
 */
export const STUDY_TRIAL_NCT_LINKS: Readonly<
  Partial<Record<string, readonly string[]>>
> = {
  "nih-whi": ["NCT00000611"],
  "nih-nichd-pcos": ["NCT00166516"],
  "nih-scd-initiative": ["NCT00081523"],
  "nih-carriers": ["NCT03805919"],
  "nih-lupus-cohort": ["NCT00001735"],
  "harvard-bwh-brca": ["NCT01042379"],
  "harvard-mgh-pcos": ["NCT00176971"],
  "harvard-dfci-tnbc": ["NCT02488967"],
};

export const DOMESTIC_RESEARCH_STUDIES: readonly DomesticResearchStudy[] = [
  {
    studyId: "nih-all-of-us",
    title: "All of Us Research Program",
    institution: "nih",
    institutionLabel: "NIH (All of Us)",
    sampleSize: 800_000,
    sampleSizeNote: "800K+ consented US participants with genomic + EHR data (2024 milestone)",
    conditions: ["Multi-disease", "Population genomics", "Health equity"],
    markerGenes: ["BRCA1", "BRCA2", "HBB", "APOE"],
    geography: "US",
    dataTier: "cited_public",
    source: "NIH All of Us Research Program enrollment reports (2024)",
    sourceYear: 2024,
    clinicalTrialsSponsor: "National Institutes of Health",
  },
  {
    studyId: "nih-whi",
    title: "Women's Health Initiative (WHI)",
    institution: "nih",
    institutionLabel: "NIH NHLBI",
    sampleSize: 161_808,
    sampleSizeNote: "161,808 postmenopausal women enrolled across clinical trial + observational cohorts",
    conditions: ["Breast cancer", "Cardiovascular", "Osteoporosis", "Hormone therapy"],
    markerGenes: ["BRCA1", "BRCA2", "ESR1"],
    geography: "US",
    dataTier: "cited_public",
    source: "NIH NHLBI Women's Health Initiative (WHI) study documentation",
    sourceYear: 2023,
    clinicalTrialsSponsor: "National Heart, Lung, and Blood Institute",
  },
  {
    studyId: "nih-nichd-pcos",
    title: "NICHD PCOS Research Network",
    institution: "nih",
    institutionLabel: "NIH NICHD",
    sampleSize: 1_500,
    sampleSizeNote: "Multi-site PCOS phenotyping cohort across RMN sites",
    conditions: ["PCOS", "Reproductive endocrinology", "Insulin resistance"],
    markerGenes: ["DENND1A", "FSHR", "LHCGR", "INSR"],
    geography: "US",
    dataTier: "cited_public",
    source: "NICHD Reproductive Medicine Network PCOS studies (ClinicalTrials.gov portfolio)",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Eunice Kennedy Shriver National Institute of Child Health and Human Development",
    variantCallsetId: "nih-nichd-pcos-grch38",
  },
  {
    studyId: "nih-scd-initiative",
    title: "NIH Sickle Cell Disease Initiative",
    institution: "nih",
    institutionLabel: "NIH NHLBI / NIMHD",
    sampleSize: 7_500,
    sampleSizeNote: "Multi-site SCD genomics + outcomes cohort (aggregate public trial enrollment)",
    conditions: ["Sickle cell disease", "Sickle cell trait"],
    markerGenes: ["HBB", "HBA1", "HBA2"],
    geography: "US",
    dataTier: "cited_public",
    source: "NHLBI Sickle Cell Disease Research and Treatment; CDC SCD surveillance (2024)",
    sourceYear: 2024,
    clinicalTrialsSponsor: "National Heart, Lung, and Blood Institute",
    variantCallsetId: "nih-scd-hbb-grch38",
  },
  {
    studyId: "nih-tcga-breast",
    title: "TCGA Breast Invasive Carcinoma (NCI)",
    institution: "nih",
    institutionLabel: "NIH NCI / TCGA",
    sampleSize: 1_098,
    sampleSizeNote: "1,098 breast tumor + matched normal genomic profiles in TCGA-BRCA",
    conditions: ["Breast cancer", "Triple-negative breast cancer", "HER2+"],
    markerGenes: ["BRCA1", "BRCA2", "TP53", "PIK3CA", "GATA3"],
    geography: "US",
    dataTier: "cited_public",
    source: "NCI TCGA Breast Invasive Carcinoma (TCGA-BRCA) data portal",
    sourceYear: 2024,
    clinicalTrialsSponsor: "National Cancer Institute",
    variantCallsetId: "demo-brca-panel-grch38",
  },
  {
    studyId: "harvard-nhs2",
    title: "Nurses' Health Study II",
    institution: "harvard",
    institutionLabel: "Harvard T.H. Chan School of Public Health",
    sampleSize: 116_686,
    sampleSizeNote: "116,686 female nurses enrolled 1989–present; longitudinal reproductive + chronic disease",
    conditions: ["PCOS", "Endometriosis", "Breast cancer", "Fertility"],
    markerGenes: ["DENND1A", "BRCA1", "BRCA2"],
    geography: "US",
    dataTier: "cited_public",
    source: "Harvard Chan Nurses' Health Study II cohort documentation",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Harvard School of Public Health",
  },
  {
    studyId: "harvard-bwhs",
    title: "Black Women's Health Study",
    institution: "harvard",
    institutionLabel: "Boston University / Harvard-affiliated",
    sampleSize: 59_000,
    sampleSizeNote: "~59,000 Black women followed since 1995 for cancer, reproductive, and cardiometabolic outcomes",
    conditions: ["Breast cancer", "Uterine fibroids", "Lupus", "Diabetes"],
    markerGenes: ["BRCA1", "BRCA2", "HBB", "STAT4"],
    geography: "US",
    dataTier: "cited_public",
    source: "Black Women's Health Study (BWHS) cohort publications; BU Slone Epidemiology Center",
    sourceYear: 2024,
    variantCallsetId: "harvard-bwhs-panel-grch38",
  },
  {
    studyId: "harvard-bwh-brca",
    title: "Brigham BRCA Carrier Cohort",
    institution: "harvard",
    institutionLabel: "Harvard / Brigham and Women's Hospital",
    sampleSize: 4_200,
    sampleSizeNote: "Hereditary cancer clinic carrier cohort — aggregate published enrollment range",
    conditions: ["Hereditary breast cancer", "Ovarian cancer", "Lynch syndrome"],
    markerGenes: ["BRCA1", "BRCA2", "PALB2", "CHEK2", "MLH1"],
    geography: "US",
    dataTier: "illustrative_static",
    source: "Illustrative aggregate — BWH Center for Hereditary Cancer syndromes literature",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Brigham and Women's Hospital",
    variantCallsetId: "harvard-bwh-brca-grch38",
  },
  {
    studyId: "harvard-mgh-pcos",
    title: "MGH PCOS Longitudinal Cohort",
    institution: "harvard",
    institutionLabel: "Harvard / Massachusetts General Hospital",
    sampleSize: 2_800,
    sampleSizeNote: "Reproductive endocrine clinic PCOS phenotyping + metabolic profiling",
    conditions: ["PCOS", "Infertility", "Metabolic syndrome"],
    markerGenes: ["DENND1A", "FSHR", "INSR", "HMGA2"],
    geography: "US",
    dataTier: "illustrative_static",
    source: "Illustrative aggregate — MGH Reproductive Endocrine Unit research portfolio",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Massachusetts General Hospital",
    variantCallsetId: "harvard-mgh-pcos-grch38",
  },
  {
    studyId: "broad-gnomad",
    title: "gnomAD v4 reference (Broad Institute)",
    institution: "harvard_mit_collab",
    institutionLabel: "Broad Institute of MIT and Harvard",
    sampleSize: 807_162,
    sampleSizeNote: "807,162 genome sequences — population reference, not a disease cohort",
    conditions: ["Population reference", "Variant interpretation"],
    markerGenes: ["BRCA1", "BRCA2", "HBB", "DENND1A"],
    geography: "US",
    dataTier: "cited_public",
    source: "gnomAD v4 release (Broad Institute of MIT and Harvard, 2024)",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Broad Institute",
  },
  {
    studyId: "mit-broad-cancer",
    title: "Broad Cancer Cell Line Encyclopedia (CCLE)",
    institution: "mit",
    institutionLabel: "MIT / Broad Institute",
    sampleSize: 1_457,
    sampleSizeNote: "1,457 cancer cell lines with genomic characterization — model systems, not patients",
    conditions: ["Breast cancer", "Ovarian cancer", "Precision oncology"],
    markerGenes: ["BRCA1", "TP53", "PIK3CA", "ERBB2"],
    geography: "US",
    dataTier: "cited_public",
    source: "DepMap / CCLE (Broad Institute, 2024)",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Broad Institute",
  },
  {
    studyId: "nih-carriers",
    title: "CARRIERS BRCA Mutation Study (NCI)",
    institution: "nih",
    institutionLabel: "NIH NCI",
    sampleSize: 35_000,
    sampleSizeNote: "35,000+ women unselected for cancer history screened for BRCA1/2 pathogenic variants",
    conditions: ["Hereditary breast cancer", "Population screening"],
    markerGenes: ["BRCA1", "BRCA2"],
    geography: "US",
    dataTier: "cited_public",
    source: "CARRIERS consortium publications (NCI-funded, 2021–2024)",
    sourceYear: 2024,
    clinicalTrialsSponsor: "National Cancer Institute",
  },
  {
    studyId: "harvard-dfci-tnbc",
    title: "Dana-Farber Triple-Negative Breast Cancer Genomics",
    institution: "harvard",
    institutionLabel: "Harvard / Dana-Farber Cancer Institute",
    sampleSize: 1_650,
    sampleSizeNote: "TNBC tumor sequencing cohort — aggregate published sample counts",
    conditions: ["Triple-negative breast cancer", "Breast cancer disparities"],
    markerGenes: ["BRCA1", "BRCA2", "TP53", "BARD1"],
    geography: "US",
    dataTier: "illustrative_static",
    source: "Illustrative aggregate — DFCI breast oncology genomics publications",
    sourceYear: 2024,
    clinicalTrialsSponsor: "Dana-Farber Cancer Institute",
  },
  {
    studyId: "nih-lupus-cohort",
    title: "NIH Lupus Family Registry and Repository",
    institution: "nih",
    institutionLabel: "NIH NIAMS / NIAID",
    sampleSize: 3_600,
    sampleSizeNote: "Multigenerational lupus families with genetic + clinical phenotyping",
    conditions: ["Systemic lupus erythematosus", "Autoimmunity"],
    markerGenes: ["HLA-DRB1", "STAT4", "IRF5", "TNFSF4"],
    geography: "US",
    dataTier: "cited_public",
    source: "NIH Lupus Family Registry and Repository (LFRR) documentation",
    sourceYear: 2023,
    clinicalTrialsSponsor: "National Institute of Arthritis and Musculoskeletal and Skin Diseases",
    variantCallsetId: "nih-lupus-sle-grch38",
  },
] as const;

export interface StudySampleStats {
  totalStudies: number;
  totalSampleSize: number;
  byInstitution: Record<DomesticInstitution, { studies: number; sampleSize: number }>;
}

/** Aggregate sample-size universe across the domestic catalog. */
export function computeStudySampleStats(
  studies: readonly DomesticResearchStudy[] = DOMESTIC_RESEARCH_STUDIES,
): StudySampleStats {
  const byInstitution: StudySampleStats["byInstitution"] = {
    nih: { studies: 0, sampleSize: 0 },
    harvard: { studies: 0, sampleSize: 0 },
    mit: { studies: 0, sampleSize: 0 },
    harvard_mit_collab: { studies: 0, sampleSize: 0 },
  };

  let totalSampleSize = 0;
  for (const study of studies) {
    byInstitution[study.institution].studies += 1;
    byInstitution[study.institution].sampleSize += study.sampleSize;
    totalSampleSize += study.sampleSize;
  }

  return {
    totalStudies: studies.length,
    totalSampleSize,
    byInstitution,
  };
}

/**
 * Page and filter the static domestic study catalog (in-memory source of truth).
 */
export function filterDomesticStudies(input: {
  institution?: DomesticInstitution;
  condition?: string;
  limit: number;
  offset: number;
}): {
  studies: DomesticResearchStudy[];
  meta: { total: number; limit: number; offset: number };
} {
  let rows = [...DOMESTIC_RESEARCH_STUDIES];

  if (input.institution) {
    rows = rows.filter((s) => s.institution === input.institution);
  }
  if (input.condition) {
    const needle = input.condition.toLowerCase();
    rows = rows.filter((s) =>
      s.conditions.some((c) => c.toLowerCase().includes(needle)) ||
      s.title.toLowerCase().includes(needle) ||
      s.markerGenes.some((g) => g.toLowerCase().includes(needle))
    );
  }

  const total = rows.length;
  const studies = rows.slice(input.offset, input.offset + input.limit);
  return { studies, meta: { total, limit: input.limit, offset: input.offset } };
}
