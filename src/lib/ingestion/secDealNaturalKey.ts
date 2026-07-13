/**
 * Deterministic natural keys for SEC candidate deals.
 * Uniqueness: accession + CIK + normalized form type.
 */

/** Strip dashes and lowercase for stable accession comparison. */
export function normalizeSecAccession(accession: string): string {
  return accession.replace(/-/g, "").toLowerCase();
}

/** Pad CIK to 10 digits (SEC convention). */
export function normalizeSecCik(cik: string | number): string {
  const digits = String(cik).replace(/\D/g, "");
  return digits.padStart(10, "0");
}

/** Uppercase alphanumeric only — e.g. `8-K` → `8K`, `8-K/A` → `8KA`. */
export function normalizeSecFormType(formType: string): string {
  return formType.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Stable natural key for lacuna_deals dedup and ingest checkpoints.
 * Format: `{cik10}|{accessionNoDash}|{formNormalized}`
 */
export function buildSecDealNaturalKey(
  accession: string,
  cik: string | number,
  formType: string,
): string {
  return [
    normalizeSecCik(cik),
    normalizeSecAccession(accession),
    normalizeSecFormType(formType),
  ].join("|");
}

/** Public deal_id used in review UI (backward compatible with legacy rows). */
export function buildDealId(
  accession: string,
  cik: string | number,
  _formType = "8-K",
): string {
  const cikDigits = String(cik).replace(/\D/g, "");
  return `sec-${cikDigits}-${normalizeSecAccession(accession)}`;
}

export interface FilingCheckpoint {
  filingDate: string;
  naturalKey: string;
}

/**
 * When scanning newest-first, skip filings already processed before a crash.
 * Returns true when the filing is strictly newer than the checkpoint frontier.
 */
export function shouldSkipFilingOnResume(
  filingDate: string,
  naturalKey: string,
  checkpoint: FilingCheckpoint | null,
): boolean {
  if (!checkpoint?.naturalKey) return false;
  if (filingDate > checkpoint.filingDate) return true;
  if (filingDate < checkpoint.filingDate) return false;
  return naturalKey > checkpoint.naturalKey;
}
