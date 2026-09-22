/**
 * Catalog-selection provenance. Values are recovered from the verified
 * dataset only — never imputed from outside knowledge.
 */

export const CATALOG_ENTRY_REASONS = [
  "deal-list",
  "trial-registry",
  "press",
  "sec",
  "referral",
  "other",
  "unknown",
] as const;

export type CatalogEntryReason = (typeof CATALOG_ENTRY_REASONS)[number];

export const OUTCOME_TYPES = [
  "acquired",
  "ipo",
  "shutdown",
  "still-private",
  "unknown",
] as const;

export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const FOUNDED_PRECISION = ["year", "estimated", "unknown"] as const;

export type FoundedPrecision = (typeof FOUNDED_PRECISION)[number];

const SEC_RE = /\b(sec(?:\s+edgar)?|8-k|10-k|10-q|s-1|s-4|defm14a|ex-99)\b/i;
const TRIAL_RE = /clinicaltrials\.gov|\bct\.gov\b/i;
const PRESS_RE =
  /press release|pr newswire|business wire|globe newswire|cision|techcrunch|fierce(?:\s|$)|massdevice|axios/i;

/**
 * Recover how a company entered the catalog. Prefer the acquisitions
 * array (deal-list) over source-string heuristics. Returns `unknown`
 * when nothing in the tree supports a more specific reason.
 */
export function deriveCatalogEntryReason(
  sources: readonly string[] | undefined,
  isAcquisitionTarget: boolean,
): CatalogEntryReason {
  if (isAcquisitionTarget) return "deal-list";
  const blob = (sources ?? []).join(" ");
  if (SEC_RE.test(blob)) return "sec";
  if (TRIAL_RE.test(blob)) return "trial-registry";
  if (PRESS_RE.test(blob)) return "press";
  return "unknown";
}

/**
 * Label founding-year precision. Missing years stay absent on the row;
 * this field records that they were not imputed.
 */
export function deriveFoundedPrecision(
  founded: number | undefined,
): FoundedPrecision {
  return founded === undefined ? "unknown" : "year";
}

/**
 * Outcome is `acquired` only when the company is a target in
 * `acquisitions`. Every other state is `unknown` — not still-private.
 */
export function deriveOutcomeType(isAcquisitionTarget: boolean): OutcomeType {
  return isAcquisitionTarget ? "acquired" : "unknown";
}
