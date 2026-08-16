/**
 * ClinicalTrials.gov, openFDA, and CMS may appear on `/deals/[id]` only
 * when a reviewer has keyed the row to a verified `targetId` with a
 * public NCT or CPT citation. A live API search on the company name is
 * enrichment — not verified M&A.
 */

export type RegulatoryCitationSource =
  | "clinicaltrials.gov"
  | "openfda"
  | "cms";

export type RegulatoryCodeKind = "nct" | "cpt";

export interface KeyedRegulatoryCitation {
  readonly targetId: string;
  readonly source: RegulatoryCitationSource;
  readonly codeKind: RegulatoryCodeKind;
  /** NCT######## or CPT / HCPCS code */
  readonly code: string;
  readonly citationUrl: string;
  readonly label?: string;
}

const NCT_ID = /^NCT\d{8}$/i;
/** CPT Category I (5 digits) or HCPCS Level II (letter + 4 digits). */
const CPT_OR_HCPCS = /^(?:\d{5}|[A-Z]\d{4})$/i;

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

/**
 * True when `code` is an NCT id and `url` is a public ClinicalTrials.gov
 * study page for that id — not an API search by sponsor or company name.
 */
export function isPublicNctCitation(code: string, url: string): boolean {
  if (!NCT_ID.test(code)) return false;
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  if (hostnameOf(parsed) !== "clinicaltrials.gov") return false;
  if (parsed.pathname.startsWith("/api/")) return false;
  return parsed.pathname.toUpperCase().includes(code.toUpperCase());
}

/**
 * True when `code` is a CPT/HCPCS code and `url` is a public CMS page —
 * not a name-search enrichment payload.
 */
export function isPublicCptCitation(code: string, url: string): boolean {
  if (!CPT_OR_HCPCS.test(code)) return false;
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  const host = hostnameOf(parsed);
  return host === "cms.gov" || host.endsWith(".cms.gov");
}

/**
 * Gate for deal-dossier display. Name-only rows and live search URLs fail.
 */
export function isKeyedRegulatoryCitation(
  row: KeyedRegulatoryCitation,
): boolean {
  if (!row.targetId.trim()) return false;
  if (row.codeKind === "nct") {
    return isPublicNctCitation(row.code, row.citationUrl);
  }
  if (row.codeKind === "cpt") {
    return isPublicCptCitation(row.code, row.citationUrl);
  }
  return false;
}

/**
 * Human-curated NCT/CPT citations keyed to a verified company id.
 * Empty until a reviewer attaches a public registry or fee-schedule URL.
 * Do not populate from `/api/enrichment/company` or other name searches.
 */
export const KEYED_REGULATORY_CITATIONS: readonly KeyedRegulatoryCitation[] =
  [];

/**
 * Citations eligible for `/deals/[id]`. Returns [] when none are keyed
 * to this target — the page must not fall back to a live name search.
 */
export function keyedRegulatoryCitationsForTarget(
  targetId: string,
): KeyedRegulatoryCitation[] {
  if (!targetId.trim()) return [];
  return KEYED_REGULATORY_CITATIONS.filter((row) =>
    row.targetId === targetId && isKeyedRegulatoryCitation(row)
  );
}
