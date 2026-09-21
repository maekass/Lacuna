/**
 * Typed consumer for the committed acquisition-time hazard artifact.
 *
 * Relative hazard is exp(xβ) from a Breslow Cox fit on companies with a
 * disclosed founded year. Missing inputs return insufficient_disclosed_data.
 * This module does not forecast M&A or invent sector/TAM fallbacks.
 */

import hazardArtifact from "@/data/ml/hazard/acquisition-time-v1.json";

export const HAZARD_FEATURE_LABELS: Readonly<Record<string, string>> = {
  sector_fertility: "Fertility",
  sector_diagnostics: "Diagnostics",
};

export interface HazardCohortMeta {
  readonly n: number;
  readonly nEvents: number;
  readonly nCensored: number;
  readonly nCompanies: number;
  readonly excludedMissingFounded: number;
  readonly excludedNonpositiveTime: number;
  readonly excludedMissingSector: number;
  readonly timeUnit: string;
  readonly censorDate: string;
  readonly notes: readonly string[];
}

export interface HazardBaseline {
  readonly estimator: string;
  readonly times: readonly number[];
  readonly cumulativeHazard: readonly number[];
  readonly survival: readonly number[];
}

export interface HazardSufficiency {
  readonly minEvents: number;
  readonly minEventsPerCoefficient: number;
  readonly fits: boolean;
  readonly reason: string | null;
}

export interface HazardArtifact {
  readonly schemaVersion: string;
  readonly id: string;
  readonly modelType: "cox_ph_breslow";
  readonly task: string;
  readonly claimClass: "descriptive";
  readonly fittedAt: string;
  readonly datasetVersion?: string | null;
  readonly datasetSha256: string;
  readonly disclaimer: string;
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly cohort: HazardCohortMeta;
  readonly featureNames: readonly string[];
  readonly keptFeatureNames: readonly string[];
  readonly droppedFeatureNames: readonly string[];
  readonly coefficients: readonly number[];
  readonly hazardRatios: readonly number[];
  readonly baseline: HazardBaseline;
  readonly metrics: {
    readonly concordance: number | null;
    readonly n: number;
    readonly nEvents: number;
    readonly logPartialLikelihood: number;
    readonly nIter: number;
    readonly converged: boolean;
  };
  readonly sufficiency: HazardSufficiency;
  readonly fitNotes: readonly string[];
}

export interface HazardScoreInput {
  readonly sector?: string;
  /** Optional follow-up time in years from founded (Jan 1), when known. */
  readonly timeYears?: number;
}

export interface HazardScoreOk {
  readonly status: "ok";
  readonly claimClass: "descriptive";
  readonly modelId: string;
  readonly sector: string;
  readonly linearPredictor: number;
  readonly relativeHazard: number;
  readonly keptFeatures: readonly string[];
  readonly disclaimer: string;
  readonly concordance: number | null;
  readonly baselineSurvival: number | null;
  readonly cumulativeHazard: number | null;
}

export interface HazardScoreInsufficient {
  readonly status: "insufficient_disclosed_data";
  readonly claimClass: "descriptive";
  readonly modelId: string;
  readonly reason: string;
  readonly disclaimer: string;
}

export type HazardScore = HazardScoreOk | HazardScoreInsufficient;

export const HAZARD_ARTIFACT = hazardArtifact as HazardArtifact;

/** Disclaimer copied from the Python claims module via the artifact. */
export const HAZARD_DISCLAIMER = HAZARD_ARTIFACT.disclaimer;

function insufficient(reason: string): HazardScoreInsufficient {
  return {
    status: "insufficient_disclosed_data",
    claimClass: "descriptive",
    modelId: HAZARD_ARTIFACT.id,
    reason,
    disclaimer: HAZARD_DISCLAIMER,
  };
}

/**
 * Encode disclosed sector dummies. Unknown sector names map to the reference
 * group (all zeros); a missing sector is handled by the scorer, not here.
 */
export function encodeHazardFeatures(
  sector: string,
  featureNames: readonly string[] = HAZARD_ARTIFACT.featureNames,
): number[] {
  return featureNames.map((name) => {
    const label = HAZARD_FEATURE_LABELS[name];
    return label && sector === label ? 1 : 0;
  });
}

function dot(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function keptDesign(
  x: readonly number[],
  artifact: HazardArtifact,
): number[] {
  return artifact.keptFeatureNames.map((name) => {
    const idx = artifact.featureNames.indexOf(name);
    return idx >= 0 ? (x[idx] ?? 0) : 0;
  });
}

/**
 * Right-continuous step lookup on the Breslow baseline. Returns null when
 * `timeYears` is omitted or the baseline is empty.
 */
export function lookupBaseline(
  timeYears: number,
  baseline: HazardBaseline = HAZARD_ARTIFACT.baseline,
): { survival: number; cumulativeHazard: number } | null {
  if (!Number.isFinite(timeYears) || timeYears < 0) return null;
  const { times, survival, cumulativeHazard } = baseline;
  if (times.length === 0) return { survival: 1, cumulativeHazard: 0 };
  let idx = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= timeYears) idx = i;
    else break;
  }
  if (idx < 0) return { survival: 1, cumulativeHazard: 0 };
  return {
    survival: survival[idx] ?? 1,
    cumulativeHazard: cumulativeHazard[idx] ?? 0,
  };
}

/**
 * Score a company against the committed Cox artifact.
 *
 * Relative hazard is versus the collapsed non-Fertility / non-Diagnostics
 * reference group in this curated sample. It is not a probability.
 */
export function scoreHazard(
  input: HazardScoreInput,
  artifact: HazardArtifact = HAZARD_ARTIFACT,
): HazardScore {
  if (artifact.claimClass !== "descriptive") {
    return insufficient("Artifact claimClass is not descriptive.");
  }
  if (!artifact.sufficiency.fits) {
    return insufficient(
      artifact.sufficiency.reason ??
        "Verified cohort is too small to report relative hazards.",
    );
  }
  const sector = input.sector?.trim();
  if (!sector) {
    return insufficient("Sector is missing from disclosed company fields.");
  }
  if (artifact.keptFeatureNames.length === 0) {
    return insufficient("No sector dummy cleared the event-count floor.");
  }
  if (artifact.coefficients.length !== artifact.keptFeatureNames.length) {
    return insufficient(
      "Artifact coefficients are misaligned with kept features.",
    );
  }

  const x = encodeHazardFeatures(sector, artifact.featureNames);
  const xKept = keptDesign(x, artifact);
  const linearPredictor = dot(xKept, artifact.coefficients);
  const relativeHazard = Math.exp(linearPredictor);

  let baselineSurvival: number | null = null;
  let cumulativeHazard: number | null = null;
  if (input.timeYears != null && Number.isFinite(input.timeYears)) {
    const step = lookupBaseline(input.timeYears, artifact.baseline);
    if (step) {
      const scale = relativeHazard;
      cumulativeHazard = step.cumulativeHazard * scale;
      baselineSurvival = Math.exp(-cumulativeHazard);
    }
  }

  return {
    status: "ok",
    claimClass: "descriptive",
    modelId: artifact.id,
    sector,
    linearPredictor,
    relativeHazard,
    keptFeatures: artifact.keptFeatureNames,
    disclaimer: artifact.disclaimer,
    concordance: artifact.metrics.concordance,
    baselineSurvival,
    cumulativeHazard,
  };
}

/** Convenience wrapper that only reads `sector` from a verified company row. */
export function scoreVerifiedCompanyHazard(
  company: { readonly sector?: string; readonly founded?: number },
  artifact: HazardArtifact = HAZARD_ARTIFACT,
): HazardScore {
  if (company.founded == null) {
    return insufficient(
      "Missing founded year is exclusion, not imputation.",
    );
  }
  return scoreHazard({ sector: company.sector }, artifact);
}
