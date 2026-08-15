/**
 * Clinical performance figures as incommensurable measurements.
 *
 * Aggregation / ranking must refuse incomparable inputs. Prevalence adjustment
 * for PPV/NPV requires sensitivity and specificity at the type level — rows
 * with evidenceGap (PPV present, sens/spec null) cannot call prevalenceAdjust.
 */

export type StudyDesign =
  | "case_control"
  | "cohort"
  | "randomized"
  | "cross_sectional"
  | "meta_analysis"
  | "other";

export interface ConfidenceInterval {
  readonly lower: number;
  readonly upper: number;
  readonly level: number;
}

export interface MeasurementPopulation {
  readonly label: string;
  readonly geography?: string;
  readonly careSetting?: string;
  /** Disease prevalence in the studied population, 0–1, when known. */
  readonly prevalence?: number;
}

interface MeasurementBase {
  readonly endpoint: string;
  readonly threshold: string;
  readonly population: MeasurementPopulation;
  readonly studyDesign: StudyDesign;
  readonly value: number;
  readonly ci?: ConfidenceInterval;
  readonly citation?: string;
}

/** PPV/NPV rows that lack sens/spec — cannot be prevalence-adjusted. */
export interface EvidenceGapMeasurement extends MeasurementBase {
  readonly kind: "ppv" | "npv" | "other";
  readonly evidenceGap: true;
  readonly sensitivity?: null;
  readonly specificity?: null;
}

/** Fully specified classification operating point. */
export interface ClassifierMeasurement extends MeasurementBase {
  readonly kind: "classifier";
  readonly evidenceGap: false;
  readonly sensitivity: number;
  readonly specificity: number;
  readonly prevalence: number;
}

export type Measurement = EvidenceGapMeasurement | ClassifierMeasurement;

export type IncomparableReason =
  | { readonly code: "endpoint_mismatch"; readonly detail: string }
  | { readonly code: "threshold_mismatch"; readonly detail: string }
  | { readonly code: "population_mismatch"; readonly detail: string }
  | { readonly code: "design_mismatch"; readonly detail: string }
  | { readonly code: "prevalence_unknown"; readonly detail: string };

export type Comparability =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasons: readonly IncomparableReason[] };

/** Compare two measurements; mismatch reasons are returned instead of coerced. */
export function isComparable(a: Measurement, b: Measurement): Comparability {
  const reasons: IncomparableReason[] = [];
  if (a.endpoint !== b.endpoint) {
    reasons.push({
      code: "endpoint_mismatch",
      detail: `${a.endpoint} vs ${b.endpoint}`,
    });
  }
  if (a.threshold !== b.threshold) {
    reasons.push({
      code: "threshold_mismatch",
      detail: `${a.threshold} vs ${b.threshold}`,
    });
  }
  if (
    a.population.label !== b.population.label ||
    a.population.careSetting !== b.population.careSetting ||
    a.population.geography !== b.population.geography
  ) {
    reasons.push({
      code: "population_mismatch",
      detail: `${a.population.label} vs ${b.population.label}`,
    });
  }
  if (a.studyDesign !== b.studyDesign) {
    reasons.push({
      code: "design_mismatch",
      detail: `${a.studyDesign} vs ${b.studyDesign}`,
    });
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * Rank measurements that share a comparison basis.
 * Throws if any pair is incomparable — refusal at the call boundary.
 */
export function rankMeasurements(
  measurements: readonly Measurement[],
): Measurement[] {
  if (measurements.length <= 1) return [...measurements];
  for (let i = 0; i < measurements.length; i++) {
    for (let j = i + 1; j < measurements.length; j++) {
      const cmp = isComparable(measurements[i]!, measurements[j]!);
      if (!cmp.ok) {
        throw new Error(
          `Refusing to rank incomparable measurements: ${
            cmp.reasons.map((r) => r.code).join(", ")
          }`,
        );
      }
    }
  }
  return [...measurements].sort((a, b) => b.value - a.value);
}

/**
 * Bayes prevalence adjustment for PPV.
 * Type-unavailable without non-null sensitivity and specificity.
 */
export function prevalenceAdjustPpv(
  measurement: ClassifierMeasurement,
  targetPrevalence: number,
): number {
  if (targetPrevalence < 0 || targetPrevalence > 1) {
    throw new Error("targetPrevalence must be in [0, 1]");
  }
  const sens = measurement.sensitivity;
  const spec = measurement.specificity;
  const p = targetPrevalence;
  const tp = sens * p;
  const fp = (1 - spec) * (1 - p);
  const denom = tp + fp;
  if (denom === 0) return 0;
  return tp / denom;
}

/**
 * Bayes prevalence adjustment for NPV.
 * Type-unavailable without non-null sensitivity and specificity.
 */
export function prevalenceAdjustNpv(
  measurement: ClassifierMeasurement,
  targetPrevalence: number,
): number {
  if (targetPrevalence < 0 || targetPrevalence > 1) {
    throw new Error("targetPrevalence must be in [0, 1]");
  }
  const sens = measurement.sensitivity;
  const spec = measurement.specificity;
  const p = targetPrevalence;
  const tn = spec * (1 - p);
  const fn = (1 - sens) * p;
  const denom = tn + fn;
  if (denom === 0) return 0;
  return tn / denom;
}
