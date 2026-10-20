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

import type { AggregateCoverage, AnnouncedDate, CoverageRatio } from "./types";

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

/**
 * Principal deal and exit interpretation boundary.
 * One placement per screen — not a repeating card footer.
 */
export const LACUNA_SAMPLE_BOUNDARY_NOTE =
  "Lacuna is a curated public-source sample, not a census of women's-health M&A. Coverage varies by sector, geography, disclosure availability, and women's-health scope. Undisclosed transaction values are excluded from disclosed-value totals.";

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
        "External frame (272 announced exits 2000–2024, plus 4 highlighted 2025 exits in the 276 headline) is broader; Lacuna promotes a curated educational subset only",
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

/**
 * AOA Dx Follow the Exits systematic frame. The report's "Scope, criteria, and
 * sources" page: "This report examines 272 publicly announced exits of women's
 * health companies between 2000 and 2024" and "Select billion-dollar exits
 * from 2025 are highlighted ... though a comprehensive 2025 analysis is not
 * included." The 276 headline is 272 + those 4 highlighted 2025 exits, so
 * 2025 is not a comparable frame year.
 * https://aoadx.com/wp-content/uploads/2026/01/Follow-the-Exits-Womens-Health-Jan-2026.pdf
 */
export const AOA_DX_FRAME = {
  name: "AOA Dx Follow the Exits (2000–2024)",
  startYear: 2000,
  endYear: 2024,
  referenceCount: 272,
} as const;

/** Calendar year of a deal's public announcement, at any stored precision. */
export function announcedYear(announced: AnnouncedDate): number {
  switch (announced.precision) {
    case "day":
      return Number(announced.date.slice(0, 4));
    case "month":
      return Number(announced.yearMonth.slice(0, 4));
    case "year":
      return announced.year;
  }
}

/** True when an announcement year falls inside the AOA Dx systematic frame. */
export function isInAoaDxFrame(year: number): boolean {
  return Number.isInteger(year) && year >= AOA_DX_FRAME.startYear &&
    year <= AOA_DX_FRAME.endYear;
}

/** Lacuna deals whose announcement year is inside the AOA Dx frame. */
export function countInAoaDxFrame(
  deals: readonly { readonly announced: AnnouncedDate }[],
): number {
  return deals.filter((deal) => isInAoaDxFrame(announcedYear(deal.announced)))
    .length;
}

/**
 * Coverage against the AOA Dx frame. `inFrameDealCount` must be restricted to
 * deals announced 2000–2024 (`countInAoaDxFrame`); counting deals outside the
 * reference window against its denominator inflates the ratio.
 */
export function aoaDxCoverage(options: {
  readonly inFrameDealCount: number;
  readonly observedOverlapCount?: number;
}): CoverageRatio {
  return coverageAgainstReference({
    name: AOA_DX_FRAME.name,
    frameNote:
      "AOA Dx examines 272 publicly announced women's-health exits (acquisitions + IPOs) over 2000–2024; " +
      "its 276 headline adds 4 highlighted 2025 exits without a comprehensive 2025 analysis. " +
      "Lacuna is a curated M&A convenience sample with different inclusion rules; " +
      "overlap is not record-matched.",
    referenceCount: AOA_DX_FRAME.referenceCount,
    observedOverlapCount: options.observedOverlapCount ??
      options.inFrameDealCount,
    caveats: [
      "Numerator counts Lacuna deals announced 2000–2024; 2025–2026 Lacuna deals are outside the reference frame and excluded.",
      "Numerator is not record-matched to AOA Dx rows — interpret as upper-bound style ratio under optimistic matching, not a verified intersection size.",
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
