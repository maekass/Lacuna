/**
 * Pairwise-complete cosine similarity for the company retrieval panel.
 *
 * A dimension is used only when both sides observed it. Undisclosed
 * valuation, undisclosed funding, and founding years that are not
 * year-precision are omitted. They are not stored as zero.
 */

export interface ObservedFeature {
  readonly value: number;
  readonly observed: boolean;
}

export interface SimilarityCompanyInput {
  readonly sector: string;
  readonly stage: string;
  readonly lastKnownValuation?: number;
  readonly totalFunding?: number;
  readonly founded?: number;
  readonly foundedPrecision: "year" | "estimated" | "unknown";
}

function finiteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Feature layout: one slot per sector, then valuation, funding, age,
 * late-stage, public, and acquired flags.
 *
 * Stage flags are observed because the catalog stage string is present.
 * Age is whole years from a year-precision founding year to `asOfYear`.
 * That year is not a known calendar day, and it is not age at exit.
 */
export function buildObservedFeatures(
  company: SimilarityCompanyInput,
  sectors: readonly string[],
  asOfYear: number,
): ObservedFeature[] {
  const sectorOneHot: ObservedFeature[] = sectors.map((sector) => ({
    value: company.sector === sector ? 1 : 0,
    observed: true,
  }));
  const hasValuation = finiteNumber(company.lastKnownValuation);
  const hasFunding = finiteNumber(company.totalFunding);
  const ageObserved = company.foundedPrecision === "year" &&
    Number.isInteger(company.founded) &&
    (company.founded as number) > 1900 &&
    (company.founded as number) <= asOfYear;
  const ageNorm = ageObserved
    ? Math.min(1, (asOfYear - (company.founded as number)) / 15)
    : 0;
  const stage = company.stage;
  const isLateStage =
    /Series C|Series D|Series E|Series F|Series G|Late Stage|Pre-IPO/i.test(
        stage,
      )
      ? 1
      : 0;

  return [
    ...sectorOneHot,
    {
      value: hasValuation
        ? Math.log10((company.lastKnownValuation as number) + 1) / 4
        : 0,
      observed: hasValuation,
    },
    {
      value: hasFunding
        ? Math.log10((company.totalFunding as number) + 1) / 3
        : 0,
      observed: hasFunding,
    },
    { value: ageNorm, observed: ageObserved },
    { value: isLateStage, observed: true },
    { value: /Public/i.test(stage) ? 1 : 0, observed: true },
    { value: /Acquired/i.test(stage) ? 1 : 0, observed: true },
  ];
}

/**
 * Cosine over dimensions both vectors observed.
 * Returns null when there is no overlapping observed magnitude.
 * A zero result is not used as a stand-in for "no data".
 */
export function pairwiseCosine(
  left: readonly ObservedFeature[],
  right: readonly ObservedFeature[],
): number | null {
  if (left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let magLeft = 0;
  let magRight = 0;
  let used = 0;
  for (let index = 0; index < left.length; index++) {
    const a = left[index];
    const b = right[index];
    if (!a?.observed || !b?.observed) continue;
    dot += a.value * b.value;
    magLeft += a.value * a.value;
    magRight += b.value * b.value;
    used += 1;
  }
  if (used === 0) return null;
  const denom = Math.sqrt(magLeft) * Math.sqrt(magRight);
  if (!(denom > 0)) return null;
  const similarity = dot / denom;
  return Number.isFinite(similarity) ? similarity : null;
}

/**
 * Mean of observed values on each dimension.
 * A dimension nobody observed stays unobserved (not a zero centroid).
 */
export function observedCentroid(
  vectors: readonly (readonly ObservedFeature[])[],
): ObservedFeature[] {
  const width = vectors[0]?.length ?? 0;
  if (vectors.length === 0 || width === 0) return [];
  return Array.from({ length: width }, (_, index) => {
    const observed = vectors
      .map((vector) => vector[index])
      .filter((feature): feature is ObservedFeature =>
        feature?.observed === true
      );
    if (observed.length === 0) return { value: 0, observed: false };
    const mean = observed.reduce((sum, feature) => sum + feature.value, 0) /
      observed.length;
    return { value: mean, observed: Number.isFinite(mean) };
  });
}

/**
 * Labels whose observed values sit within 20% of an observed centroid.
 * Unobserved dimensions are not described as shared.
 */
export function sharedObservedFactors(
  values: readonly ObservedFeature[],
  centroid: readonly ObservedFeature[],
  labels: readonly string[],
): string[] {
  return labels.filter((label, index) => {
    const company = values[index];
    const center = centroid[index];
    if (!label || !company?.observed || !center?.observed) return false;
    if (!(center.value > 0)) return false;
    return Math.abs(company.value - center.value) <= center.value * 0.2;
  });
}
