/**
 * Curated genetic markers for women's health conditions with documented disparities.
 * Educational reference — not clinical interpretation or variant classification.
 */

export type DiseaseMarkerCategory =
  | "pcos"
  | "breast_cancer"
  | "sickle_cell"
  | "lupus"
  | "hereditary_cancer";

export interface DiseaseMarkerGene {
  symbol: string;
  chrom: string;
  role: string;
}

export interface DiseaseMarkerPanel {
  id: DiseaseMarkerCategory;
  title: string;
  summary: string;
  disparityNote: string;
  genes: readonly DiseaseMarkerGene[];
  /** Gene symbols used for variant-store queries */
  queryGenes: readonly string[];
  relatedSectors: readonly string[];
  source: string;
}

export const DISEASE_MARKER_PANELS: readonly DiseaseMarkerPanel[] = [
  {
    id: "pcos",
    title: "PCOS genetic markers",
    summary:
      "Polycystic ovary syndrome is polygenic; DENND1A, FSHR, and related loci are among the most studied susceptibility signals in reproductive-age women.",
    disparityNote:
      "PCOS affects an estimated 5M+ US women; insulin resistance and cardiometabolic risk are higher in many cohorts (WHO 2026; CDC 2024).",
    genes: [
      { symbol: "DENND1A", chrom: "9", role: "Ovarian androgen signaling" },
      {
        symbol: "FSHR",
        chrom: "2",
        role: "Follicle-stimulating hormone receptor",
      },
      { symbol: "LHCGR", chrom: "2", role: "LH receptor — ovulation timing" },
      { symbol: "INSR", chrom: "19", role: "Insulin resistance pathway" },
      { symbol: "HMGA2", chrom: "12", role: "Polygenic height/PCOS overlap" },
    ],
    queryGenes: ["DENND1A", "FSHR", "LHCGR", "INSR"],
    relatedSectors: ["Diagnostics", "Reproductive Health", "Fertility"],
    source: "WHO PCOS fact sheet (Jan 2026); NICHD PCOS survey (2024)",
  },
  {
    id: "breast_cancer",
    title: "Hereditary breast & ovarian cancer",
    summary:
      "Pathogenic variants in BRCA1/2 and partner genes drive hereditary breast and ovarian cancer risk; genomic profiling guides screening and treatment.",
    disparityNote:
      "Black women face ~38% higher breast cancer mortality; younger-onset and triple-negative subtypes are more common (ACS 2025).",
    genes: [
      {
        symbol: "BRCA1",
        chrom: "17",
        role: "DNA repair — high penetrant HBOC",
      },
      {
        symbol: "BRCA2",
        chrom: "13",
        role: "DNA repair — HBOC and ovarian risk",
      },
      { symbol: "PALB2", chrom: "16", role: "BRCA2-interacting repair" },
      { symbol: "CHEK2", chrom: "22", role: "Moderate-penetrance breast risk" },
      { symbol: "TP53", chrom: "17", role: "Li-Fraumeni / early-onset breast" },
    ],
    queryGenes: ["BRCA1", "BRCA2", "PALB2", "CHEK2", "TP53"],
    relatedSectors: ["Breast Health", "Precision Medicine", "Diagnostics"],
    source: "ACS Breast Cancer Facts & Figures 2024–2025; NCCN HBOC guidelines",
  },
  {
    id: "sickle_cell",
    title: "Sickle cell disease (HBB)",
    summary:
      "Hemoglobin beta (HBB) variants including HbS cause sickle cell disease and trait; newborn screening and gene therapy pipelines are active investment areas.",
    disparityNote:
      "~1 in 365 Black or African American births affected by SCD in the US; ~1 in 13 carry sickle cell trait (CDC 2024).",
    genes: [
      { symbol: "HBB", chrom: "11", role: "HbS / sickle cell disease" },
      {
        symbol: "HBA1",
        chrom: "16",
        role: "Alpha-globin — compound heterozygosity",
      },
      { symbol: "HBA2", chrom: "16", role: "Alpha-thalassemia modifier" },
    ],
    queryGenes: ["HBB", "HBA1", "HBA2"],
    relatedSectors: ["Diagnostics", "Precision Medicine"],
    source:
      "CDC Sickle Cell Data Collection program (2024); NHLBI SCD guidelines",
  },
  {
    id: "lupus",
    title: "Lupus / SLE genetic susceptibility",
    summary:
      "Systemic lupus erythematosus has strong HLA and interferon-pathway genetic components; Black women are diagnosed at higher rates with worse outcomes.",
    disparityNote:
      "Black women develop lupus at younger ages with higher organ damage and mortality vs white women (LFA 2024; ACR disparities reviews).",
    genes: [
      {
        symbol: "HLA-DRB1",
        chrom: "6",
        role: "MHC class II — strongest SLE signal",
      },
      { symbol: "STAT4", chrom: "2", role: "Interferon / autoimmunity" },
      { symbol: "IRF5", chrom: "7", role: "Type I interferon regulation" },
      { symbol: "TNFSF4", chrom: "1", role: "T-cell co-stimulation (OX40L)" },
    ],
    queryGenes: ["STAT4", "IRF5", "TNFSF4"],
    relatedSectors: ["Diagnostics", "Precision Medicine"],
    source: "Lupus Foundation of America; ACR lupus disparities literature",
  },
  {
    id: "hereditary_cancer",
    title: "Lynch syndrome & multi-gene panels",
    summary:
      "Mismatch-repair genes (MLH1, MSH2, MSH6, PMS2) drive Lynch syndrome; multi-gene panels overlap with breast and endometrial cancer risk in women's health.",
    disparityNote:
      "Under-testing and later-stage diagnosis contribute to excess mortality in underserved populations — panel access is an equity issue.",
    genes: [
      { symbol: "MLH1", chrom: "3", role: "Mismatch repair — Lynch syndrome" },
      { symbol: "MSH2", chrom: "2", role: "Mismatch repair — Lynch syndrome" },
      {
        symbol: "MSH6",
        chrom: "2",
        role: "Mismatch repair — endometrial risk",
      },
      { symbol: "PMS2", chrom: "7", role: "Mismatch repair — Lynch spectrum" },
    ],
    queryGenes: ["MLH1", "MSH2", "MSH6", "PMS2"],
    relatedSectors: ["Diagnostics", "Precision Medicine", "Breast Health"],
    source: "NCCN Lynch syndrome guidelines; ACMG secondary findings (v3.2)",
  },
] as const;

/** Flat list of all queryable gene symbols across panels. */
export function allDiseaseMarkerGenes(): string[] {
  const seen = new Set<string>();
  for (const panel of DISEASE_MARKER_PANELS) {
    for (const gene of panel.queryGenes) seen.add(gene);
  }
  return [...seen];
}

export function getDiseaseMarkerPanel(
  id: DiseaseMarkerCategory,
): DiseaseMarkerPanel | undefined {
  return DISEASE_MARKER_PANELS.find((p) => p.id === id);
}
