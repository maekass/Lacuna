/**
 * SEC EDGAR Full-Text Search (EFTS) — discover filings across all filers.
 * @see https://www.sec.gov/edgar/search/efts-faq.html
 */

import {
  secFetchHeaders,
  secRateLimitPause,
} from "@/lib/ingestion/secFairAccess";
import { buildWhEftsQuery } from "@/lib/ingestion/publicRecords/whSearchTerms";

const EFTS_BASE = "https://efts.sec.gov/LATEST/search-index";

export interface EftsHit {
  cik: string;
  companyName: string;
  form: string;
  filingDate: string;
  accession: string;
}

export interface EftsSearchOptions {
  query: string;
  forms?: string[];
  sinceDate: string;
  untilDate?: string;
  from?: number;
  size?: number;
}

interface EftsSource {
  ciks?: string[];
  display_names?: string[];
  form?: string;
  file_date?: string;
  adsh?: string;
  root_forms?: string[];
}

interface EftsResponse {
  hits?: {
    hits?: Array<{ _source?: EftsSource }>;
    total?: { value?: number };
  };
}

function parseHit(source: EftsSource): EftsHit | null {
  const cik = source.ciks?.[0]?.replace(/^0+/, "") ?? "";
  const accession = source.adsh ?? "";
  if (!cik || !accession) return null;
  return {
    cik,
    companyName: source.display_names?.[0] ?? "Unknown",
    form: source.form ?? source.root_forms?.[0] ?? "Unknown",
    filingDate: source.file_date ?? "",
    accession,
  };
}

/**
 * Search SEC full-text index. Requires SEC_EDGAR_USER_AGENT.
 */
export async function searchEdgarFullText(
  options: EftsSearchOptions,
): Promise<{ hits: EftsHit[]; total: number }> {
  const until = options.untilDate ?? new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    q: options.query,
    dateRange: "custom",
    startdt: options.sinceDate,
    enddt: until,
    from: String(options.from ?? 0),
    size: String(Math.min(options.size ?? 50, 100)),
  });
  for (const form of options.forms ?? []) {
    params.append("forms", form);
  }

  const url = `${EFTS_BASE}?${params.toString()}`;
  const response = await fetch(url, { headers: secFetchHeaders() });
  if (!response.ok) {
    throw new Error(`EFTS search failed: HTTP ${response.status}`);
  }

  const data = await response.json() as EftsResponse;
  const hits = (data.hits?.hits ?? [])
    .map((h) => parseHit(h._source ?? {}))
    .filter((h): h is EftsHit => h != null);

  await secRateLimitPause();
  return { hits, total: data.hits?.total?.value ?? hits.length };
}

/** 8-K filings mentioning Item 2.01 with women's-health terms. */
export async function searchMaFilingsWomensHealth(
  sinceDate: string,
  size = 50,
): Promise<EftsHit[]> {
  const wh = buildWhEftsQuery();
  const query = `"Item 2.01" AND (${wh})`;
  const { hits } = await searchEdgarFullText({
    query,
    forms: ["8-K"],
    sinceDate,
    size,
  });
  return hits;
}

/** Form D / D/A filings with women's-health terms in issuer text. */
export async function searchFormDFilingsWomensHealth(
  sinceDate: string,
  size = 100,
): Promise<EftsHit[]> {
  const query = buildWhEftsQuery();
  const { hits } = await searchEdgarFullText({
    query,
    forms: ["D", "D/A"],
    sinceDate,
    size,
  });
  return hits;
}
