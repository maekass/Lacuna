import process from "node:process";

/**
 * SEC EDGAR connector — submissions API, 8-K Item 2.01 heuristic parse.
 * Callable from CLI, cron route, or future MCP server wrapper.
 *
 * @see https://www.sec.gov/os/webmaster-faq#code-support
 * Requires SEC_EDGAR_USER_AGENT env (e.g. "Lacuna Research you@example.com").
 */

import {
  alertApiFailure,
  alertPartialParse,
  logRateLimitPause,
} from "@/lib/ingestion/monitoringAlerts";
import {
  buildFilingUrl,
  loadSecTickerMap,
  padCik,
  resolveTicker,
  type SecTickerEntry,
} from "@/lib/ingestion/secEdgarClient";

const SEC_DATA_BASE = "https://data.sec.gov";
export const SEC_RATE_LIMIT_MS = 120;

/** Healthcare/pharma SIC prefixes per SEC industry codes. */
export const HEALTHCARE_SIC_PREFIXES = ["283", "384"] as const;

export type ParseQuality = "full" | "partial" | "keyword_only";

export interface SecSubmissionMeta {
  name: string;
  cik: string;
  sic?: string;
  sicDescription?: string;
  tickers?: string[];
}

export interface ParsedAcquisition {
  dealId: string;
  secAccession: string;
  acquirerName: string;
  acquirerTicker?: string;
  acquirerCik: string;
  targetName?: string;
  announcedDate?: string;
  closedDate?: string;
  dealValueMillions?: number;
  dealValueNote?: string;
  dealStructure?: string;
  earnoutTerms?: string;
  filingUrl: string;
  filingDate: string;
  item201Excerpt?: string;
  parseQuality: ParseQuality;
  sicCode?: string;
  sicDescription?: string;
  filingTextSample: string;
}

interface SubmissionsJson {
  name: string;
  cik: string;
  sic?: string;
  sicDescription?: string;
  tickers?: string[];
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
      'SEC_EDGAR_USER_AGENT is required (SEC policy). Example: "Lacuna Research you@example.com"',
    );
  }
  return ua;
}

export async function secRateLimitPause(
  ms: number = SEC_RATE_LIMIT_MS,
): Promise<void> {
  logRateLimitPause(ms);
  await new Promise((r) => setTimeout(r, ms));
}

async function secFetch(
  url: string,
  accept = "application/json",
): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "User-Agent": getUserAgent(),
    },
  });
  if (!response.ok) {
    alertApiFailure(url, response.status);
  }
  return response;
}

export function isHealthcareSic(sic: string | undefined): boolean {
  if (!sic) return false;
  return HEALTHCARE_SIC_PREFIXES.some((prefix) => sic.startsWith(prefix));
}

export function buildDealId(accession: string, cik: string): string {
  return `sec-${cik}-${accession.replace(/-/g, "")}`;
}

/** Fetch company submissions metadata including SIC. */
export async function fetchSubmissions(
  cik: number,
): Promise<SecSubmissionMeta> {
  const url = `${SEC_DATA_BASE}/submissions/CIK${padCik(cik)}.json`;
  const response = await secFetch(url);
  if (!response.ok) {
    throw new Error(
      `SEC submissions failed for CIK ${cik}: ${response.status}`,
    );
  }
  const data = (await response.json()) as SubmissionsJson;
  return {
    name: data.name,
    cik: data.cik,
    sic: data.sic,
    sicDescription: data.sicDescription,
    tickers: data.tickers,
  };
}

/** Download primary 8-K document as plain text (HTML tags stripped). */
export async function fetchFilingText(filingUrl: string): Promise<string> {
  const response = await secFetch(filingUrl, "text/html, text/plain, */*");
  if (!response.ok) {
    throw new Error(`SEC filing fetch failed: ${response.status} ${filingUrl}`);
  }
  const raw = await response.text();
  return stripHtml(raw);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(
      /&#(\d+);/g,
      (_, code: string) => String.fromCharCode(Number(code)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

const ITEM_201_PATTERN =
  /item\s*2\.01[\s\S]*?(completion of acquisition|disposition of assets|acquisition or disposition)/i;

const ITEM_END_PATTERN = /item\s*2\.0[2-9]|item\s*[3-9]\./i;

/**
 * Heuristic Item 2.01 extraction — not XBRL-grade; many filings use varied formatting.
 */
export function extractItem201Section(text: string): string | undefined {
  const match = text.match(ITEM_201_PATTERN);
  if (!match) return undefined;

  const startIdx = match.index ?? 0;
  const rest = text.slice(startIdx);
  const endMatch = rest.slice(match[0].length).match(ITEM_END_PATTERN);
  const endIdx = endMatch?.index !== undefined
    ? startIdx + match[0].length + endMatch.index
    : startIdx + 8000;
  return text.slice(startIdx, Math.min(endIdx, startIdx + 12000)).trim();
}

export function filingContainsItem201(text: string): boolean {
  return /item\s*2\.01/i.test(text) &&
    /acquisition|disposition of assets|merger|purchase/i.test(text);
}

function parseTargetName(section: string): string | undefined {
  const patterns = [
    /acquired\s+(?:all\s+)?(?:of\s+the\s+)?(?:outstanding\s+)?(?:shares\s+of\s+)?([A-Z][A-Za-z0-9&.,'\-\s]{2,60}?)(?:,\s*a|\s+Inc\.|\s+LLC|\s+Ltd\.|\s+Corp\.|\s+\(|\.)/,
    /(?:target|acquiree|seller)[:\s]+([A-Z][A-Za-z0-9&.,'\-\s]{2,60}?)(?:,\s*a|\s+Inc\.|\s+LLC|\.)/i,
    /purchase\s+of\s+(?:the\s+)?([A-Z][A-Za-z0-9&.,'\-\s]{2,60}?)(?:\s+business|\s+assets|\.)/i,
  ];
  for (const re of patterns) {
    const m = section.match(re);
    if (m?.[1]) return m[1].trim().replace(/\s{2,}/g, " ");
  }
  return undefined;
}

function parseDealValue(section: string): { millions?: number; note?: string } {
  const billion = section.match(/\$\s*([\d,.]+)\s*billion/i);
  if (billion?.[1]) {
    const val = parseFloat(billion[1].replace(/,/g, ""));
    if (!Number.isNaN(val)) {
      return {
        millions: val * 1000,
        note: `$${billion[1]} billion (from filing text)`,
      };
    }
  }
  const million = section.match(/\$\s*([\d,.]+)\s*million/i);
  if (million?.[1]) {
    const val = parseFloat(million[1].replace(/,/g, ""));
    if (!Number.isNaN(val)) {
      return {
        millions: val,
        note: `$${million[1]} million (from filing text)`,
      };
    }
  }
  const undisclosed = /undisclosed|not disclosed|did not disclose/i.test(
    section,
  );
  if (undisclosed) {
    return { note: "Consideration not disclosed in Item 2.01 excerpt" };
  }
  return {};
}

function parseStructure(section: string): string | undefined {
  if (/merger agreement|plan of merger|merged with/i.test(section)) {
    return "Merger";
  }
  if (
    /asset purchase agreement|purchase substantially all assets/i.test(section)
  ) return "Asset purchase";
  if (/stock purchase agreement|share purchase/i.test(section)) {
    return "Stock purchase";
  }
  if (/business combination/i.test(section)) return "Business combination";
  return undefined;
}

function parseEarnout(section: string): string | undefined {
  const m = section.match(/earn[- ]?out[^.]{0,200}\./i);
  return m?.[0]?.trim();
}

function parseClosedDate(section: string): string | undefined {
  const m = section.match(
    /(?:closed|completed|consummated)\s+(?:on\s+)?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  if (!m?.[1]) return undefined;
  const d = new Date(m[1]);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * Parse Item 2.01 from filing plain text. Returns partial results when structure is ambiguous.
 */
export function parseItem201(input: {
  text: string;
  accession: string;
  filingUrl: string;
  filingDate: string;
  acquirerName: string;
  acquirerTicker?: string;
  acquirerCik: string;
  sicCode?: string;
  sicDescription?: string;
}): ParsedAcquisition | undefined {
  if (!filingContainsItem201(input.text)) return undefined;

  const section = extractItem201Section(input.text);
  if (!section) {
    alertPartialParse(
      input.accession,
      "Item 2.01 header found but section boundary unclear",
    );
    return {
      dealId: buildDealId(input.accession, input.acquirerCik),
      secAccession: input.accession,
      acquirerName: input.acquirerName,
      acquirerTicker: input.acquirerTicker,
      acquirerCik: input.acquirerCik,
      filingUrl: input.filingUrl,
      filingDate: input.filingDate,
      parseQuality: "keyword_only",
      sicCode: input.sicCode,
      sicDescription: input.sicDescription,
      filingTextSample: input.text.slice(0, 4000),
    };
  }

  const targetName = parseTargetName(section);
  const { millions, note } = parseDealValue(section);
  const dealStructure = parseStructure(section);
  const earnoutTerms = parseEarnout(section);
  const closedDate = parseClosedDate(section);

  let parseQuality: ParseQuality = "partial";
  if (targetName && (millions !== undefined || note)) {
    parseQuality = "full";
  } else if (!targetName && !millions && !note) {
    parseQuality = "keyword_only";
    alertPartialParse(
      input.accession,
      "Item 2.01 present but target/value not extracted",
    );
  } else {
    alertPartialParse(input.accession, "Incomplete target or value fields");
  }

  return {
    dealId: buildDealId(input.accession, input.acquirerCik),
    secAccession: input.accession,
    acquirerName: input.acquirerName,
    acquirerTicker: input.acquirerTicker,
    acquirerCik: input.acquirerCik,
    targetName,
    announcedDate: input.filingDate,
    closedDate,
    dealValueMillions: millions,
    dealValueNote: note,
    dealStructure,
    earnoutTerms,
    filingUrl: input.filingUrl,
    filingDate: input.filingDate,
    item201Excerpt: section.slice(0, 4000),
    parseQuality,
    sicCode: input.sicCode,
    sicDescription: input.sicDescription,
    filingTextSample: section.slice(0, 4000),
  };
}

export interface ScanOptions {
  sinceDate?: string;
  limitPerTicker?: number;
  healthcareSicOnly?: boolean;
}

/**
 * Scan tickers for recent 8-K filings; fetch and parse Item 2.01 where present.
 */
export async function scanItem201Acquisitions(
  tickers: string[],
  options: ScanOptions = {},
): Promise<ParsedAcquisition[]> {
  const {
    sinceDate = `${new Date().getFullYear() - 1}-01-01`,
    limitPerTicker = 15,
    healthcareSicOnly = false,
  } = options;

  const results: ParsedAcquisition[] = [];

  for (const ticker of tickers) {
    const entry = await resolveTicker(ticker);
    if (!entry) continue;

    const meta = await fetchSubmissions(entry.cik);
    if (healthcareSicOnly && !isHealthcareSic(meta.sic)) {
      await secRateLimitPause();
      continue;
    }

    const filings = await listRecent8KFilings(entry.cik, {
      sinceDate,
      limit: limitPerTicker,
    });

    for (const filing of filings) {
      await secRateLimitPause();
      let text: string;
      try {
        text = await fetchFilingText(filing.filingUrl);
      } catch {
        continue;
      }

      const parsed = parseItem201({
        text,
        accession: filing.accessionNumber,
        filingUrl: filing.filingUrl,
        filingDate: filing.filingDate,
        acquirerName: meta.name,
        acquirerTicker: entry.ticker,
        acquirerCik: String(entry.cik),
        sicCode: meta.sic,
        sicDescription: meta.sicDescription,
      });

      if (parsed) results.push(parsed);
      await secRateLimitPause();
    }

    await secRateLimitPause();
  }

  return results.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
}

interface FilingRef {
  accessionNumber: string;
  filingDate: string;
  filingUrl: string;
  primaryDocument: string;
}

async function listRecent8KFilings(
  cik: number,
  options: { sinceDate: string; limit: number },
): Promise<FilingRef[]> {
  const url = `${SEC_DATA_BASE}/submissions/CIK${padCik(cik)}.json`;
  const response = await secFetch(url);
  if (!response.ok) {
    throw new Error(
      `SEC submissions failed for CIK ${cik}: ${response.status}`,
    );
  }
  const data = (await response.json()) as SubmissionsJson;
  const recent = data.filings.recent;
  const refs: FilingRef[] = [];

  for (let i = 0; i < recent.form.length && refs.length < options.limit; i++) {
    if (recent.form[i] !== "8-K") continue;
    const filingDate = recent.filingDate[i];
    if (filingDate < options.sinceDate) continue;

    const accessionNumber = recent.accessionNumber[i];
    const primaryDocument = recent.primaryDocument[i];
    refs.push({
      accessionNumber,
      filingDate,
      primaryDocument,
      filingUrl: buildFilingUrl(cik, accessionNumber, primaryDocument),
    });
  }

  return refs;
}

/** Resolve healthcare-sector tickers from SEC company list (SIC 283x / 384x). */
export async function listHealthcareTickers(
  limit = 100,
): Promise<SecTickerEntry[]> {
  const map = await loadSecTickerMap();
  const entries = [...map.values()];
  const healthcare: SecTickerEntry[] = [];

  for (const entry of entries) {
    if (healthcare.length >= limit) break;
    try {
      const meta = await fetchSubmissions(entry.cik);
      if (isHealthcareSic(meta.sic)) {
        healthcare.push(entry);
      }
      await secRateLimitPause();
    } catch {
      // skip CIKs that fail submissions fetch
    }
  }

  return healthcare;
}

export { buildFilingUrl, loadSecTickerMap, padCik, resolveTicker };
