/**
 * Women's-health relevance vocabulary for future evidence labeling.
 *
 * Definitions follow WHAM's business-case framing. This module does not
 * classify companies, acquirers, or verified deals.
 */

export type WomensHealthRelevance =
  | "exclusive"
  | "disproportionate"
  | "differential"
  | "multi-category"
  | "adjacent"
  | "unclassified";

export interface WomensHealthSourceMetadata {
  readonly label: string;
  /** Public URL when one is stored. Null means no URL is on file. */
  readonly url: string | null;
  /** Local placeholder until a citable URL is added. */
  readonly localSourceMetadata: string;
}

/**
 * Citation metadata for the relevance vocabulary.
 * The URL is WHAM's January 2026 release page. The local slug is a repo
 * identifier, not a second verification claim.
 *
 * Deprecated for new source lookup: the canonical record is
 * `wham-business-case-2026` in `src/lib/research/sourceRegistry.ts`.
 * This citation object stays so existing relevance labels keep their copy.
 */
export const WHAM_BUSINESS_CASE_SOURCE: WomensHealthSourceMetadata = {
  label:
    "WHAM, The Business Case for Accelerating Women's Health Investment, January 2026",
  url:
    "https://whamnow.org/news/the-wham-report-womens-health-as-a-catalyst-for-sustainable-healthcare-growth/",
  localSourceMetadata: "local-source:wham-business-case-january-2026",
};

export interface WomensHealthRelevanceMeta {
  readonly relevance: WomensHealthRelevance;
  readonly label: string;
  readonly shortDefinition: string;
  readonly methodologyNote: string;
  readonly intendedUse: string;
  readonly sourceLabel: string;
  readonly sourceUrl: string | null;
  readonly localSourceMetadata: string;
}

const SHARED_SOURCE = {
  sourceLabel: WHAM_BUSINESS_CASE_SOURCE.label,
  sourceUrl: WHAM_BUSINESS_CASE_SOURCE.url,
  localSourceMetadata: WHAM_BUSINESS_CASE_SOURCE.localSourceMetadata,
} as const;

const NOT_APPLIED =
  "Not applied to Lacuna companies, acquirers, or verified deals in this release.";

export const WOMENS_HEALTH_RELEVANCE_ORDER = [
  "exclusive",
  "disproportionate",
  "differential",
  "multi-category",
  "adjacent",
  "unclassified",
] as const satisfies readonly WomensHealthRelevance[];

export const WOMENS_HEALTH_RELEVANCE_META: Record<
  WomensHealthRelevance,
  WomensHealthRelevanceMeta
> = {
  exclusive: {
    relevance: "exclusive",
    label: "Exclusive",
    shortDefinition: "A condition uniquely affecting women.",
    methodologyNote:
      `WHAM-aligned label for a condition that affects women and not men. ${NOT_APPLIED}`,
    intendedUse:
      "Future research labeling and diligence questions. Not clinical guidance, valuation, or an investment recommendation.",
    ...SHARED_SOURCE,
  },
  disproportionate: {
    relevance: "disproportionate",
    label: "Disproportionate",
    shortDefinition: "Women have higher prevalence, severity, or burden.",
    methodologyNote:
      `WHAM-aligned label where sourced burden is higher for women. This is not a prevalence calculator. ${NOT_APPLIED}`,
    intendedUse:
      "Future research labeling when a cited source supports a higher burden for women. Not a measured Lacuna statistic.",
    ...SHARED_SOURCE,
  },
  differential: {
    relevance: "differential",
    label: "Differential",
    shortDefinition:
      "Women have distinct biology, presentation, treatment response, or care pathway.",
    methodologyNote:
      `WHAM-aligned label for sex-differential biology, presentation, treatment response, or care pathway. Not clinical guidance. ${NOT_APPLIED}`,
    intendedUse:
      "Future research labeling for diligence questions about sex-differential context. Not a treatment recommendation.",
    ...SHARED_SOURCE,
  },
  "multi-category": {
    relevance: "multi-category",
    label: "Multi-category",
    shortDefinition: "More than one category applies.",
    methodologyNote:
      `Holding label when more than one relevance category applies. Do not collapse the categories into a single score. ${NOT_APPLIED}`,
    intendedUse:
      "Future research labeling when a reviewer records more than one category. Not a composite risk or value score.",
    ...SHARED_SOURCE,
  },
  adjacent: {
    relevance: "adjacent",
    label: "Adjacent",
    shortDefinition:
      "Relevant to the women's-health ecosystem but not yet supported as sex-specific.",
    methodologyNote:
      `Lacuna holding label for ecosystem relevance that the cited source does not yet support as sex-specific. Adjacent is not a positive sex-specific classification. ${NOT_APPLIED}`,
    intendedUse:
      "Future research labeling for context that may sit near women's health without a sex-specific source. Not deal scope promotion.",
    ...SHARED_SOURCE,
  },
  unclassified: {
    relevance: "unclassified",
    label: "Unclassified",
    shortDefinition: "Not yet reviewed.",
    methodologyNote:
      `Lacuna holding label for records that have not been reviewed against this vocabulary. Missing review is not evidence of relevance or irrelevance. ${NOT_APPLIED}`,
    intendedUse:
      "Future research labeling for items still awaiting review. Not a default women's-health classification.",
    ...SHARED_SOURCE,
  },
};

/** Metadata for one relevance term. Does not classify any deal entity. */
export function getWomensHealthRelevanceMeta(
  relevance: WomensHealthRelevance,
): WomensHealthRelevanceMeta {
  return WOMENS_HEALTH_RELEVANCE_META[relevance];
}

/** All relevance terms in display order, with metadata. */
export function listWomensHealthRelevance(): readonly WomensHealthRelevanceMeta[] {
  return WOMENS_HEALTH_RELEVANCE_ORDER.map(
    (relevance) => WOMENS_HEALTH_RELEVANCE_META[relevance],
  );
}
