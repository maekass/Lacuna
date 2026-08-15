/**
 * Sampling frame and coverage as a documented ratio — not capture-recapture.
 *
 * Capture-recapture (Lincoln–Petersen) requires two independent samples with
 * identifiable overlap. Lacuna's curated set and external lists such as AOA Dx
 * exits share a trade-press substrate and are not reliably matchable at the
 * record level. Independence fails; applying Lincoln–Petersen would manufacture
 * false precision. This module therefore exposes coverage only as an observed
 * ratio against a named external reference whose own frame is documented.
 */

import type { AggregateCoverage, CoverageRatio } from "./types";

export interface KnownExclusion {
  readonly name: string;
  readonly reason: string;
  readonly estimatedValueMillions?: number;
  readonly source?: string;
}

export interface SamplingFrame {
  readonly name: string;
  readonly dealSizeFloorMillions: number | null;
  readonly dateRange: { readonly start: string; readonly end: string };
  readonly sectorDefinitions: readonly string[];
  readonly geography: readonly string[];
  readonly inclusionNotes: readonly string[];
  readonly knownExclusions: readonly KnownExclusion[];
}

/** Lacuna verified-deal convenience sample frame (educational, not a census). */
export const LACUNA_VERIFIED_FRAME: SamplingFrame = {
  name: "Lacuna verified women's-health M&A convenience sample",
  dealSizeFloorMillions: null,
  dateRange: { start: "2012-01-01", end: "2026-12-31" },
  sectorDefinitions: [
    "Fertility / reproductive medicine",
    "Maternal health",
    "Menopause therapeutics",
    "Gynecological surgery & devices",
    "Breast health devices & diagnostics",
    "Women's oncology adjacency (documented)",
    "Consumer digital health with majority-female users (documented exceptions)",
  ],
  geography: ["United States", "Europe", "Select global fertility platforms"],
  inclusionNotes: [
    "Convenience sample promoted from public SEC filings and press — not a census of women's-health M&A.",
    "Large-cap oncology / medtech deals may be tagged scope=adjacency when the acquirer franchise is broader than women's health.",
    "Undisclosed prices remain in the deal count but contribute 0 to disclosed-only totals.",
  ],
  knownExclusions: [
    {
      name: "Private deals with no public announcement",
      reason: "Unobservable under public-source inclusion rule",
    },
    {
      name: "Sub-threshold tuck-ins without IR/SEC footprint",
      reason: "Fail practical discovery via filings and major trade press",
    },
    {
      name: "AOA Dx exits outside Lacuna promotion criteria",
      reason:
        "External 276-exit frame (2000–2025) is broader; Lacuna promotes a curated educational subset only",
      source: "AOA Dx Follow the Exits (Jan 2026)",
    },
  ],
};

export interface ExternalReferenceList {
  readonly name: string;
  readonly frameNote: string;
  /** Count of exits/deals in the reference list's own frame. */
  readonly referenceCount: number;
  /** How many Lacuna rows are treated as in-frame overlaps (manual / documented). */
  readonly observedOverlapCount: number;
  readonly caveats?: readonly string[];
}

const DEFAULT_CAVEATS = [
  "Coverage is an observed ratio against a named external list — not a population estimator.",
  "Do not apply capture-recapture / Lincoln–Petersen: Lacuna and AOA Dx share trade-press substrate (dependence) and records are not reliably matchable.",
  "Denominator inherits the reference list's frame assumptions; mismatch with Lacuna's inclusion criteria biases the ratio.",
] as const;

/**
 * Coverage = observedOverlap / referenceCount (documented ratio).
 * When overlap is unknown, pass observedOverlapCount = Lacuna deal count and
 * state that assumption in frameNote / caveats.
 */
export function coverageAgainstReference(
  reference: ExternalReferenceList,
): CoverageRatio {
  if (reference.referenceCount <= 0) {
    throw new Error("referenceCount must be positive");
  }
  const rate = reference.observedOverlapCount / reference.referenceCount;
  return {
    rate,
    numerator: reference.observedOverlapCount,
    denominator: reference.referenceCount,
    referenceName: reference.name,
    referenceFrameNote: reference.frameNote,
    caveats: [...DEFAULT_CAVEATS, ...(reference.caveats ?? [])],
  };
}

/** AOA Dx headline frame (276 exits, 2000–2025) — external macro reference. */
export function aoaDxCoverage(options: {
  readonly lacunaDealCount: number;
  readonly observedOverlapCount?: number;
}): CoverageRatio {
  return coverageAgainstReference({
    name: "AOA Dx Follow the Exits (2000–2025)",
    frameNote:
      "AOA Dx reports 276 women's-health exits (acquisitions + IPOs) over 2000–2025. " +
      "Lacuna is a curated M&A convenience sample with different inclusion rules; " +
      "overlap is not record-matched.",
    referenceCount: 276,
    observedOverlapCount: options.observedOverlapCount ??
      options.lacunaDealCount,
    caveats: [
      "Numerator defaults to Lacuna deal count when record-level overlap is unavailable — interpret as upper-bound style ratio under optimistic matching, not a verified intersection size.",
    ],
  });
}

/** Attach coverage to any aggregate payload. */
export function withCoverage<T extends object>(
  aggregate: T,
  coverage: CoverageRatio,
): T & AggregateCoverage {
  return { ...aggregate, coverage };
}
