/**
 * Typed consumer for the committed acquisition-time hazard artifact.
 *
 * The fit has an empty design matrix (no sector dummy covariates). Scores
 * return the Breslow / Nelson–Aalen baseline; relative hazard is 1. Missing
 * founded year returns insufficient_disclosed_data. This module does not
 * forecast M&A or invent sector/TAM fallbacks.
 */

import hazardArtifact from "@/data/ml/hazard/acquisition-time-v1.json";

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
  readonly sector: string | null;
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
 * Score a company against the committed baseline-only Cox artifact.
 *
 * Relative hazard is 1 because there are no covariates. It is not a
 * probability and not a sector contrast.
 */
export function scoreHazard(
  input: HazardScoreInput = {},
  artifact: HazardArtifact = HAZARD_ARTIFACT,
): HazardScore {
  if (artifact.claimClass !== "descriptive") {
    return insufficient("Artifact claimClass is not descriptive.");
  }
  if (!artifact.sufficiency.fits) {
    return insufficient(
      artifact.sufficiency.reason ??
        "Verified cohort is too small to report a baseline hazard.",
    );
  }
  if (artifact.featureNames.length !== 0 || artifact.keptFeatureNames.length !== 0) {
    return insufficient(
      "Artifact still lists covariates; sector dummy indicators are not used.",
    );
  }
  if (artifact.coefficients.length !== 0 || artifact.hazardRatios.length !== 0) {
    return insufficient(
      "Artifact coefficients are misaligned with the empty design matrix.",
    );
  }

  const sector = input.sector?.trim() || null;
  let baselineSurvival: number | null = null;
  let cumulativeHazard: number | null = null;
  if (input.timeYears != null && Number.isFinite(input.timeYears)) {
    const step = lookupBaseline(input.timeYears, artifact.baseline);
    if (step) {
      cumulativeHazard = step.cumulativeHazard;
      baselineSurvival = step.survival;
    }
  }

  return {
    status: "ok",
    claimClass: "descriptive",
    modelId: artifact.id,
    sector,
    linearPredictor: 0,
    relativeHazard: 1,
    keptFeatures: artifact.keptFeatureNames,
    disclaimer: artifact.disclaimer,
    concordance: artifact.metrics.concordance,
    baselineSurvival,
    cumulativeHazard,
  };
}

/** Convenience wrapper that only reads a verified company row. */
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
