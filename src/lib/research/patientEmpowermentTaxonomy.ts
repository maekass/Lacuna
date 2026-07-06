/**
 * Taxonomy for HLTH / Outcomes4Me patient empowerment framework.
 * Separates engagement (participation) from empowerment (patient-shaped care).
 */

/** Care continuum phases from the 2022 report. */
export type EmpowermentCarePhase =
  | "records"
  | "diagnosis"
  | "treatment"
  | "survivorship"
  | "overall";

export const EMPOWERMENT_PHASE_ORDER: readonly EmpowermentCarePhase[] = [
  "records",
  "diagnosis",
  "treatment",
  "survivorship",
  "overall",
] as const;

export const EMPOWERMENT_PHASE_LABELS: Record<EmpowermentCarePhase, string> = {
  records: "Medical records access",
  diagnosis: "Detection & diagnosis",
  treatment: "Active treatment",
  survivorship: "Survivorship",
  overall: "Overall empowerment",
};

/** Four prerequisites patients need to act on health goals. */
export type EmpowermentPrerequisiteId =
  | "records-access"
  | "care-team"
  | "evidence-standards"
  | "life-goals";

export const EMPOWERMENT_PREREQUISITE_ORDER: readonly EmpowermentPrerequisiteId[] =
  [
    "records-access",
    "care-team",
    "evidence-standards",
    "life-goals",
  ] as const;

export const EMPOWERMENT_PREREQUISITE_LABELS: Record<
  EmpowermentPrerequisiteId,
  string
> = {
  "records-access": "Timely, actionable medical records",
  "care-team": "Trusted multidisciplinary care team",
  "evidence-standards": "Evidence-based standards presented",
  "life-goals": "Health and life goals integrated",
};

/**
 * How the cited statistic maps to a gap index (0–100, higher = worse).
 * - `deficit_rate`: cited value is already the share experiencing the gap.
 * - `asset_inverted`: cited value is a positive rate; gap = 100 − rate.
 */
export type EmpowermentMetricPolarity = "deficit_rate" | "asset_inverted";

export type EmpowermentGapSeverity = "critical" | "high" | "moderate";

/** Provenance tier for cited vs derived vs crosswalk data. */
export type EmpowermentDataTier =
  | "cited_survey_2022"
  | "derived_static"
  | "heuristic_affinity";

export const EMPOWERMENT_DATA_TIER_LABELS: Record<EmpowermentDataTier, string> = {
  cited_survey_2022: "Cited survey (HLTH 2022)",
  derived_static: "Derived gap index",
  heuristic_affinity: "Portfolio crosswalk (heuristic)",
};

/** Public evidence tier for curated company ↔ gap links. */
export type EmpowermentSourceTier = "filing" | "press" | "trial" | "website";

export const EMPOWERMENT_SOURCE_TIER_LABELS: Record<
  EmpowermentSourceTier,
  string
> = {
  filing: "SEC / regulatory filing",
  press: "Press release",
  trial: "Clinical trial / publication",
  website: "Company / product site",
};

/** Curated link counts as evidence-backed when it cites a public URL. */
export function isEvidenceBackedLink(link: {
  sourceUrl?: string;
}): boolean {
  return Boolean(link.sourceUrl?.trim());
}

/** Portfolio join tier — curated mappings beat sector/keyword heuristics. */
export type EmpowermentMatchTier = "curated" | "sector" | "keyword";

const MATCH_TIER_RANK: Record<EmpowermentMatchTier, number> = {
  curated: 3,
  sector: 2,
  keyword: 1,
};

/** Keep the stronger affinity when a company matches multiple ways. */
export function bestMatchTier(
  current: EmpowermentMatchTier | null,
  candidate: EmpowermentMatchTier,
): EmpowermentMatchTier {
  if (!current) return candidate;
  return MATCH_TIER_RANK[candidate] > MATCH_TIER_RANK[current]
    ? candidate
    : current;
}

export function gapSeverityFromIndex(gapIndexPct: number): EmpowermentGapSeverity {
  if (gapIndexPct >= 60) return "critical";
  if (gapIndexPct >= 40) return "high";
  return "moderate";
}

export function phaseIndex(phase: EmpowermentCarePhase): number {
  return EMPOWERMENT_PHASE_ORDER.indexOf(phase);
}
