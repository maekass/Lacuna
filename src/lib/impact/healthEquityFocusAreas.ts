/**
 * Genetic-marker focus areas for health-equity framing.
 * Epidemiology rows reuse citations from EPIDEMIOLOGY_DATABASE where available.
 * Portfolio overlap is computed at runtime from the verified company list.
 */

export type HealthEquityDataTier = "cited_epidemiology" | "illustrative_static";

export interface HealthEquityFocusArea {
  id: string;
  title: string;
  summary: string;
  disparityLabel: string;
  dataTier: HealthEquityDataTier;
  source: string;
  sourceYear?: number;
  relatedSectors: readonly string[];
  /** Primary gene symbols for variant-store cross-reference */
  markerGenes: readonly string[];
  /** Matches `condition` in EPIDEMIOLOGY_DATABASE when cited_epidemiology */
  epidemiologyCondition?: string;
}

export const HEALTH_EQUITY_FOCUS_AREAS: readonly HealthEquityFocusArea[] = [
  {
    id: "pcos-genetics",
    title: "PCOS genetic markers",
    summary:
      "Polygenic and rare-variant signals (DENND1A, FSHR, LHCGR) underpin PCOS susceptibility — relevant to diagnostics and reproductive-health M&A.",
    disparityLabel:
      "5M+ US women affected; cardiometabolic comorbidity burden is high (WHO 2026; CDC 2024)",
    dataTier: "cited_epidemiology",
    source:
      "WHO Fact Sheet on PCOS (Jan 2026); NICHD PCOS Patient Survey (2024)",
    sourceYear: 2026,
    relatedSectors: ["Diagnostics", "Reproductive Health", "Fertility"],
    markerGenes: ["DENND1A", "FSHR", "LHCGR", "INSR"],
    epidemiologyCondition: "PCOS (Polycystic Ovary Syndrome)",
  },
  {
    id: "breast-cancer-genetics",
    title: "Hereditary breast & ovarian cancer markers",
    summary:
      "BRCA1/2, PALB2, and CHEK2 pathogenic variants drive HBOC risk; genomic profiling companies dominate precision-oncology deal flow.",
    disparityLabel:
      "Black women: 38% higher breast cancer mortality; younger-onset and TNBC more common (ACS 2025)",
    dataTier: "cited_epidemiology",
    source:
      "ACS Breast Cancer Facts & Figures 2024-2025; ACS Cancer Statistics for Black People (Feb 2025)",
    sourceYear: 2025,
    relatedSectors: ["Breast Health", "Precision Medicine", "Diagnostics"],
    markerGenes: ["BRCA1", "BRCA2", "PALB2", "CHEK2", "TP53"],
    epidemiologyCondition: "Breast Cancer",
  },
  {
    id: "sickle-cell-genetics",
    title: "Sickle cell disease (HBB)",
    summary:
      "HBB hemoglobin variants cause sickle cell disease and trait — a core gene-therapy and newborn-screening investment theme with stark racial disparities.",
    disparityLabel:
      "1 in 365 Black/African American births with SCD; 1 in 13 carry sickle cell trait (CDC 2024)",
    dataTier: "cited_epidemiology",
    source:
      "CDC Sickle Cell Data Collection program (2024); NHLBI SCD guidelines",
    sourceYear: 2024,
    relatedSectors: ["Diagnostics", "Precision Medicine"],
    markerGenes: ["HBB", "HBA1", "HBA2"],
    epidemiologyCondition: "Sickle Cell Disease",
  },
  {
    id: "lupus-genetics",
    title: "Lupus / SLE genetic susceptibility",
    summary:
      "HLA and interferon-pathway variants (STAT4, IRF5) contribute to lupus risk; Black women face earlier onset and higher organ damage.",
    disparityLabel:
      "Black women diagnosed younger with higher mortality vs white women (LFA 2024; ACR disparities reviews)",
    dataTier: "cited_epidemiology",
    source:
      "Lupus Foundation of America; ACR lupus disparities literature (2024)",
    sourceYear: 2024,
    relatedSectors: ["Diagnostics", "Precision Medicine"],
    markerGenes: ["HLA-DRB1", "STAT4", "IRF5", "TNFSF4"],
    epidemiologyCondition: "Systemic Lupus Erythematosus",
  },
  {
    id: "lynch-hereditary-cancer",
    title: "Lynch syndrome & multi-gene panels",
    summary:
      "Mismatch-repair genes (MLH1, MSH2, MSH6, PMS2) link endometrial and colorectal cancer risk — multi-gene panels overlap breast-health diagnostics.",
    disparityLabel:
      "Under-testing in underserved populations delays cascade screening and prevention",
    dataTier: "illustrative_static",
    source:
      "Illustrative framing — NCCN Lynch guidelines; equity gap cited in ACMG access literature",
    relatedSectors: ["Diagnostics", "Precision Medicine", "Breast Health"],
    markerGenes: ["MLH1", "MSH2", "MSH6", "PMS2"],
  },
] as const;
