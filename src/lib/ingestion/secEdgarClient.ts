import process from "node:process";

/**
 * SEC EDGAR read-only client for acquisition filing discovery.
 * Does not write to the verified dataset — outputs belong in staging CSV only.
 *
 * @see https://www.sec.gov/os/webmaster-faq#code-support
 * Requires SEC_EDGAR_USER_AGENT env (e.g. "Lacuna Research mps5cy@virginia.edu").
 */

const SEC_DATA_BASE = "https://data.sec.gov";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

const ACQUISITION_KEYWORDS = [
  "acquisition",
  "acquire",
  "merger",
  "merge",
  "purchase agreement",
  "definitive agreement",
  "asset purchase",
  "business combination",
];

export interface SecTickerEntry {
  cik: number;
  ticker: string;
  title: string;
}

export interface SecFilingHit {
  ticker: string;
  cik: string;
  companyName: string;
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
  description: string;
  filingUrl: string;
  matchedKeywords: string[];
}

interface CompanyTickersJson {
  [key: string]: { cik_str: number; ticker: string; title: string };
}

interface SubmissionsJson {
  name: string;
  cik: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

function getUserAgent(): string {
  const ua = process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (!ua) {
    throw new Error(
      'SEC_EDGAR_USER_AGENT is required (SEC policy). Example: "Lacuna Research mps5cy@virginia.edu"',
    );
  }
  return ua;
}

function secFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": getUserAgent(),
    },
  });
}

export function padCik(cik: number): string {
  return String(cik).padStart(10, "0");
}

function stripAccessionDashes(accession: string): string {
  return accession.replace(/-/g, "");
}

export function buildFilingUrl(
  cik: number,
  accessionNumber: string,
  primaryDocument: string,
): string {
  return `${SEC_ARCHIVES_BASE}/${cik}/${
    stripAccessionDashes(accessionNumber)
  }/${primaryDocument}`;
}

function matchesAcquisition(text: string): string[] {
  const lower = text.toLowerCase();
  return ACQUISITION_KEYWORDS.filter((kw) => lower.includes(kw));
}

/** Load SEC company tickers map (ticker → CIK). Cached per process. */
let tickerCache: Map<string, SecTickerEntry> | undefined;

/** Clears the in-memory ticker cache (Vitest isolation only). */
export function resetSecEdgarTickerCacheForTests(): void {
  tickerCache = undefined;
}

export async function loadSecTickerMap(): Promise<Map<string, SecTickerEntry>> {
  if (tickerCache) return tickerCache;

  const response = await secFetch(SEC_TICKERS_URL);
  if (!response.ok) {
    throw new Error(`SEC company_tickers.json failed: ${response.status}`);
  }
  const data = (await response.json()) as CompanyTickersJson;
  tickerCache = new Map();
  for (const entry of Object.values(data)) {
    tickerCache.set(entry.ticker.toUpperCase(), {
      cik: entry.cik_str,
      ticker: entry.ticker.toUpperCase(),
      title: entry.title,
    });
  }
  return tickerCache;
}

export async function resolveTicker(
  ticker: string,
): Promise<SecTickerEntry | undefined> {
  const map = await loadSecTickerMap();
  return map.get(ticker.toUpperCase());
}

/** Recent filings for a CIK, optionally filtered by form type. */
export async function fetchRecentFilings(
  cik: number,
  options: { forms?: string[]; sinceDate?: string; limit?: number } = {},
): Promise<SecFilingHit[]> {
  const { forms = ["8-K"], sinceDate, limit = 50 } = options;
  const url = `${SEC_DATA_BASE}/submissions/CIK${padCik(cik)}.json`;
  const response = await secFetch(url);
  if (!response.ok) {
    throw new Error(
      `SEC submissions failed for CIK ${cik}: ${response.status}`,
    );
  }

  const data = (await response.json()) as SubmissionsJson;
  const recent = data.filings.recent;
  const hits: SecFilingHit[] = [];

  for (let i = 0; i < recent.form.length && hits.length < limit; i++) {
    const form = recent.form[i];
    if (!forms.includes(form)) continue;

    const filingDate = recent.filingDate[i];
    if (sinceDate && filingDate < sinceDate) continue;

    const description = recent.primaryDocDescription[i] ?? "";
    const matchedKeywords = matchesAcquisition(description);
    if (matchedKeywords.length === 0) continue;

    const accessionNumber = recent.accessionNumber[i];
    const primaryDocument = recent.primaryDocument[i];

    hits.push({
      ticker: "",
      cik: String(cik),
      companyName: data.name,
      form,
      filingDate,
      accessionNumber,
      primaryDocument,
      description,
      filingUrl: buildFilingUrl(cik, accessionNumber, primaryDocument),
      matchedKeywords,
    });
  }

  return hits;
}

/** Scan tickers for recent 8-K filings whose descriptions suggest M&A activity. */
export async function scanAcquisitionFilings(
  tickers: string[],
  options: { sinceDate?: string; limitPerTicker?: number } = {},
): Promise<SecFilingHit[]> {
  const {
    sinceDate = `${new Date().getFullYear() - 3}-01-01`,
    limitPerTicker = 20,
  } = options;
  const results: SecFilingHit[] = [];

  for (const ticker of tickers) {
    const entry = await resolveTicker(ticker);
    if (!entry) continue;

    const filings = await fetchRecentFilings(entry.cik, {
      forms: ["8-K"],
      sinceDate,
      limit: limitPerTicker,
    });

    for (const filing of filings) {
      results.push({
        ...filing,
        ticker: entry.ticker,
        companyName: entry.title,
      });
    }

    // SEC fair access: stay under 10 req/s
    await new Promise((r) => setTimeout(r, 120));
  }

  return results.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
}

export function formatHitsAsCsvRows(hits: SecFilingHit[]): string[] {
  const header =
    "status,target_name,acquirer_name,acquirer_ticker,announced_date,closed_date,deal_type,deal_value_millions,deal_value_note,primary_source_url,secondary_source_url,strategic_rationale,inclusion_notes,reviewed_by,reviewed_at";
  const rows = [header];

  for (const hit of hits) {
    rows.push(
      [
        "pending",
        "",
        csvEscape(hit.companyName),
        hit.ticker,
        hit.filingDate,
        "",
        "Acquisition",
        "",
        csvEscape(
          `SEC ${hit.form} candidate — verify target and terms (${
            hit.matchedKeywords.join(", ")
          })`,
        ),
        csvEscape(hit.filingUrl),
        "",
        csvEscape(hit.description.slice(0, 200)),
        csvEscape(
          `Auto-discovered ${hit.form} ${hit.accessionNumber}; human review required`,
        ),
        "",
        "",
      ].join(","),
    );
  }

  return rows;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
