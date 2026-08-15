/**
 * Separate transaction targets from clinical comparables.
 *
 * Natera / Labcorp / Myriad-style benchmarks are clinical comparables — not
 * deals. A comparable must not carry a deal id; a transaction target must.
 * The invariant is enforced at the type level via mutually exclusive brands.
 */

const transactionBrand: unique symbol = Symbol("TransactionTarget");
const comparableBrand: unique symbol = Symbol("ClinicalComparable");

export type EvidenceRung =
  | "preclinical"
  | "analytical_validation"
  | "clinical_validation"
  | "prospective"
  | "guidelines_adopted";

export const EVIDENCE_RUNG_RANK: Readonly<Record<EvidenceRung, number>> = {
  preclinical: 0,
  analytical_validation: 1,
  clinical_validation: 2,
  prospective: 3,
  guidelines_adopted: 4,
};

/** Shared clinical asset shape for moat analysis. */
export interface ClinicalAsset {
  readonly id: string;
  readonly name: string;
  readonly indication: string;
  readonly evidenceRung: EvidenceRung;
  readonly notes?: string;
}

export type TransactionTarget = ClinicalAsset & {
  readonly [transactionBrand]: true;
  readonly dealId: string;
};

export type ClinicalComparable = ClinicalAsset & {
  readonly [comparableBrand]: true;
  /** Comparables must not reference a transaction. */
  readonly dealId?: never;
};

/** Brand a clinical asset as a transaction target bound to a deal id. */
export function asTransactionTarget(
  asset: ClinicalAsset,
  dealId: string,
): TransactionTarget {
  if (!dealId.trim()) {
    throw new Error("TransactionTarget requires a non-empty dealId");
  }
  return { ...asset, dealId, [transactionBrand]: true };
}

/** Brand a clinical asset as a comparable that must not carry a deal id. */
export function asClinicalComparable(
  asset: ClinicalAsset & { dealId?: undefined },
): ClinicalComparable {
  if ("dealId" in asset && asset.dealId != null) {
    throw new Error("ClinicalComparable must not have a dealId");
  }
  return { ...asset, [comparableBrand]: true };
}

export interface BenchmarkDelta {
  readonly assetId: string;
  readonly assetRung: EvidenceRung;
  readonly assetRank: number;
  readonly comparableCount: number;
  readonly comparableMedianRank: number;
  readonly deltaVsMedian: number;
  readonly distribution: Readonly<Record<EvidenceRung, number>>;
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Delta between an acquired asset's evidence rung and the comparable
 * distribution — the analytically interesting moat output.
 */
export function benchmarkAgainst(
  asset: TransactionTarget,
  comparables: readonly ClinicalComparable[],
): BenchmarkDelta {
  if (comparables.length === 0) {
    throw new Error("benchmarkAgainst requires a non-empty comparable set");
  }
  const ranks = comparables.map((c) => EVIDENCE_RUNG_RANK[c.evidenceRung]);
  const distribution: Record<EvidenceRung, number> = {
    preclinical: 0,
    analytical_validation: 0,
    clinical_validation: 0,
    prospective: 0,
    guidelines_adopted: 0,
  };
  for (const c of comparables) {
    distribution[c.evidenceRung] += 1;
  }
  const assetRank = EVIDENCE_RUNG_RANK[asset.evidenceRung];
  const comparableMedianRank = median(ranks);
  return {
    assetId: asset.id,
    assetRung: asset.evidenceRung,
    assetRank,
    comparableCount: comparables.length,
    comparableMedianRank,
    deltaVsMedian: assetRank - comparableMedianRank,
    distribution,
  };
}

/** Built-in clinical benchmarks — not transactions. */
export const DEFAULT_CLINICAL_COMPARABLES: readonly ClinicalComparable[] = [
  asClinicalComparable({
    id: "comparable-natera",
    name: "Natera",
    indication: "NIPT / hereditary cancer genetics",
    evidenceRung: "guidelines_adopted",
    notes: "Public clinical benchmark — not an acquired target in this layer",
  }),
  asClinicalComparable({
    id: "comparable-labcorp",
    name: "Labcorp",
    indication: "Reference lab diagnostics",
    evidenceRung: "guidelines_adopted",
    notes: "Public clinical benchmark — not an acquired target in this layer",
  }),
  asClinicalComparable({
    id: "comparable-myriad",
    name: "Myriad Genetics",
    indication: "Hereditary cancer / reproductive genetics",
    evidenceRung: "guidelines_adopted",
    notes: "Public clinical benchmark — not an acquired target in this layer",
  }),
];
