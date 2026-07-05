/**
 * Curated company ↔ empowerment gap mappings (analyst-maintained).
 * Preferred over sector/keyword heuristics in the pipeline join.
 */

export interface CuratedEmpowermentLink {
  companyId: string;
  metricId: string;
  note: string;
  /** Provenance for diligence reviewers */
  rationale: string;
}

/** Explicit portfolio ↔ gap links — human-curated, not inferred. */
export const CURATED_EMPOWERMENT_LINKS: readonly CuratedEmpowermentLink[] = [
  {
    companyId: "c24",
    metricId: "genetic-testing-not-recommended",
    note: "Biotheranostics — breast cancer prognostic genomics",
    rationale:
      "Breast Health diagnostic; EndoPredict / molecular profiling aligns with genetic testing gap.",
  },
  {
    companyId: "c37",
    metricId: "genetic-testing-not-recommended",
    note: "Genomic Health — Oncotype DX",
    rationale: "Precision oncology genomic assay; direct NCCN-adjacent testing theme.",
  },
  {
    companyId: "c38",
    metricId: "genetic-testing-not-recommended",
    note: "Foundation Medicine — comprehensive genomic profiling",
    rationale: "Tumor genomic profiling; report cites under-recommendation of testing.",
  },
  {
    companyId: "c52",
    metricId: "genetic-testing-not-recommended",
    note: "Counsyl — reproductive carrier screening",
    rationale: "Germline screening overlap with hereditary cancer testing gap.",
  },
  {
    companyId: "c65",
    metricId: "genetic-testing-not-recommended",
    note: "Sividon Diagnostics — EndoPredict",
    rationale: "Breast prognostic RNA assay; genetic/genomic profiling dimension.",
  },
  {
    companyId: "c89",
    metricId: "genetic-testing-not-recommended",
    note: "Juniper Genomics",
    rationale: "Diagnostics genomics company in sample.",
  },
  {
    companyId: "c38",
    metricId: "clinical-trial-offered",
    note: "Foundation Medicine — trial matching ecosystem",
    rationale: "Precision oncology platforms often surface trial options; maps to 1-in-5 gap.",
  },
  {
    companyId: "c39",
    metricId: "clinical-trial-offered",
    note: "Flatiron Health — real-world evidence / trial networks",
    rationale: "Oncology data network; clinical trial access theme in report.",
  },
  {
    companyId: "c46",
    metricId: "clinical-trial-offered",
    note: "GRAIL — multi-cancer early detection trials",
    rationale: "Diagnostics with heavy trial enrollment narrative.",
  },
  {
    companyId: "c133",
    metricId: "clinical-trial-offered",
    note: "xCures — trial matching platform",
    rationale: "Digital Health trial navigation; direct clinical-trial-offered gap.",
  },
  {
    companyId: "c24",
    metricId: "no-survivorship-plan",
    note: "Biotheranostics — post-treatment risk stratification",
    rationale: "Prognostic testing informs survivorship planning gap.",
  },
  {
    companyId: "c39",
    metricId: "no-survivorship-plan",
    note: "Flatiron — survivorship / RWE monitoring",
    rationale: "Longitudinal oncology data supports survivorship care planning.",
  },
  {
    companyId: "c39",
    metricId: "unaware-survivorship-resources",
    note: "Flatiron — patient community / RWE outreach",
    rationale: "Survivorship resources awareness gap in report.",
  },
  {
    companyId: "c93",
    metricId: "full-records-access",
    note: "b.well — health record aggregation",
    rationale: "Digital Health records access; Cures Act / HIPAA records gap.",
  },
  {
    companyId: "c93",
    metricId: "hipaa-compliant-institutions",
    note: "b.well — patient-directed records",
    rationale: "Records request compliance theme from report audit.",
  },
  {
    companyId: "c114",
    metricId: "full-records-access",
    note: "Maven Clinic — care navigation + records",
    rationale: "Women's health navigation platform; records access prerequisite.",
  },
  {
    companyId: "c114",
    metricId: "care-team-accessible",
    note: "Maven Clinic — virtual care team",
    rationale: "Multidisciplinary access gap (~55% in report).",
  },
  {
    companyId: "c114",
    metricId: "uncomfortable-advocating",
    note: "Maven — patient advocacy coaching",
    rationale: "Report: 1 in 2 uncomfortable advocating to care team.",
  },
  {
    companyId: "c125",
    metricId: "records-not-understandable",
    note: "Simple HealthKit — patient-readable results",
    rationale: "Health literacy / understandable records (1 in 4 gap).",
  },
  {
    companyId: "c58",
    metricId: "oncologist-listens",
    note: "Immunomedics — oncology therapeutic",
    rationale: "Breast oncology treatment; shared decision-making gap.",
  },
  {
    companyId: "c56",
    metricId: "oncologist-listens",
    note: "Seagen — oncology therapeutics",
    rationale: "Precision Medicine oncology; treatment plan preference integration.",
  },
] as const;

/** Curated links indexed by metric id. */
export function curatedLinksByMetricId(
  metricId: string,
): readonly CuratedEmpowermentLink[] {
  return CURATED_EMPOWERMENT_LINKS.filter((l) => l.metricId === metricId);
}

/** Curated links indexed by company id. */
export function curatedLinksByCompanyId(
  companyId: string,
): readonly CuratedEmpowermentLink[] {
  return CURATED_EMPOWERMENT_LINKS.filter((l) => l.companyId === companyId);
}
