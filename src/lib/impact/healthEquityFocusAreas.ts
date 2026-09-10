/**
 * Genetic-marker focus areas for health-equity framing.
 *
 * MeshIC policy: disparity claims keep the population, outcome and denominator
 * explicit. A mortality ratio must not be combined with a preventability
 * statistic from a different surveillance construct as if they were one metric.
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
  markerGenes: readonly string[];
  epidemiologyCondition?: string;
}

export const HEALTH_EQUITY_FOCUS_AREAS: readonly HealthEquityFocusArea[] = [
  {
    id: "maternal-mortality",
    title: "Maternal mortality prevention",
    summary:
      "Maternal mortality remains substantially higher for Black women in the United States. Remote monitoring, access, quality-improvement and early-warning approaches are relevant diligence themes, but clinical benefit must be evaluated separately from the disparity statistic.",
    disparityLabel:
      "2024 maternal mortality: Black women 44.8 vs White women 14.2 deaths per 100,000 live births (~3.2×). Separately, CDC MMRC review of 2017–2019 pregnancy-related deaths found >80% preventable.",
    dataTier: "cited_epidemiology",
    source:
      "CDC/NCHS Maternal Mortality Rates in the United States, 2024 (published Mar 2026); CDC Maternal Mortality Review Committees, 2017–2019 preventability analysis",
    sourceYear: 2026,
    relatedSectors: ["Maternal Health", "Diagnostics", "Wearables"],
    markerGenes: ["FLT1", "ERAP2", "INHBA"],
    epidemiologyCondition: "Maternal Health Complications",
  },
  {
    id: "pcos-genetics",
    title: "PCOS genetic markers",
    summary:
      "Polygenic and rare-variant signals (DENND1A, FSHR, LHCGR) are studied in PCOS susceptibility and may be relevant to diagnostics and reproductive-health research; gene association is not itself clinical utility.",
    disparityLabel:
      "CDC describes PCOS as affecting as many as 5 million US women; prevalence estimates vary by diagnostic criteria and population.",
    dataTier: "cited_epidemiology",
    source:
      "CDC, Diabetes and Polycystic Ovary Syndrome (PCOS), May 2024; WHO PCOS fact sheet for global prevalence context",
    sourceYear: 2024,
    relatedSectors: ["Diagnostics", "Reproductive Health", "Fertility"],
    markerGenes: ["DENND1A", "FSHR", "LHCGR", "INSR"],
    epidemiologyCondition: "PCOS (Polycystic Ovary Syndrome)",
  },
  {
    id: "breast-cancer-genetics",
    title: "Hereditary breast & ovarian cancer markers",
    summary:
      "BRCA1/2, PALB2, and CHEK2 pathogenic variants are established hereditary-cancer risk markers. Genomic profiling is relevant to precision-oncology diligence, while access and outcome disparities should remain separately sourced claims.",
    disparityLabel:
      "Black women have 38% higher breast-cancer mortality than White women despite lower incidence (ACS Breast Cancer Statistics 2024 / Black cancer statistics 2025).",
    dataTier: "cited_epidemiology",
    source:
      "American Cancer Society, Breast Cancer Facts & Figures 2024–2025; Cancer Statistics for African American/Black People, 2025",
    sourceYear: 2025,
    relatedSectors: ["Breast Health", "Precision Medicine", "Diagnostics"],
    markerGenes: ["BRCA1", "BRCA2", "PALB2", "CHEK2", "TP53"],
    epidemiologyCondition: "Breast Cancer",
  },
  {
    id: "sickle-cell-genetics",
    title: "Sickle cell disease (HBB)",
    summary:
      "HBB variants cause sickle cell disease and trait, making the condition relevant to gene-therapy, diagnostics and newborn-screening diligence; population burden and therapeutic value remain separate questions.",
    disparityLabel:
      "CDC reports SCD occurs in about 1 in 365 Black or African American births and sickle-cell trait in about 1 in 13 Black or African American babies.",
    dataTier: "cited_epidemiology",
    source:
      "CDC Sickle Cell Disease data and surveillance; NHLBI sickle cell resources",
    sourceYear: 2024,
    relatedSectors: ["Diagnostics", "Precision Medicine"],
    markerGenes: ["HBB", "HBA1", "HBA2"],
    epidemiologyCondition: "Sickle Cell Disease",
  },
  {
    id: "lupus-genetics",
    title: "Lupus / SLE genetic susceptibility",
    summary:
      "HLA and interferon-pathway variants including STAT4 and IRF5 contribute to lupus susceptibility research. Genetic association should not be presented as a stand-alone diagnostic or investment moat.",
    disparityLabel:
      "Lupus Foundation of America reports earlier disease, greater complications and higher mortality among several racial and ethnic minority groups; Black women are disproportionately affected.",
    dataTier: "cited_epidemiology",
    source:
      "Lupus Foundation of America, Lupus Facts and Statistics and Health Disparities in Lupus",
    sourceYear: 2025,
    relatedSectors: ["Diagnostics", "Precision Medicine"],
    markerGenes: ["HLA-DRB1", "STAT4", "IRF5", "TNFSF4"],
    epidemiologyCondition: "Systemic Lupus Erythematosus",
  },
  {
    id: "lynch-hereditary-cancer",
    title: "Lynch syndrome & multi-gene panels",
    summary:
      "Mismatch-repair genes (MLH1, MSH2, MSH6, PMS2) are associated with Lynch syndrome and increased endometrial and colorectal cancer risk. Access-equity framing requires separately sourced utilization data.",
    disparityLabel:
      "Access and cascade-screening equity are research questions here; no quantitative disparity is promoted without a field-level citation.",
    dataTier: "illustrative_static",
    source:
      "Illustrative research framing — use NCCN/ACMG sources before promoting a quantitative access claim",
    relatedSectors: ["Diagnostics", "Precision Medicine", "Breast Health"],
    markerGenes: ["MLH1", "MSH2", "MSH6", "PMS2"],
  },
] as const;
