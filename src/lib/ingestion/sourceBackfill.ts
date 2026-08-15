import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  VerifiedAcquirer,
  VerifiedAcquisition,
  VerifiedDataset,
} from "@/lib/data/datasetSchema";

const EFTS_URL = "https://efts.sec.gov/LATEST/search-index";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";
const FULL_TEXT_START = "2001-01-01";
const FULL_TEXT_END = "2099-12-31";
const REQUEST_INTERVAL_MS = 200;
const MAX_RETRIES = 4;
const MAX_CACHED_BODY_BYTES = 5 * 1024 * 1024;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const TRANSACTION_TERMS = [
  "acquire",
  "acquires",
  "acquired",
  "acquisition",
  "merger",
  "merge with",
  "definitive agreement",
  "tender offer",
  "business combination",
] as const;

const REJECTION_REASONS = [
  "no_fulltext_coverage",
  "acquirer_not_a_filer",
  "no_hit",
  "target_name_not_matched",
  "no_transaction_language",
  "date_out_of_range",
  "no_quote_extractable",
] as const;

export type SourceBackfillRejectionReason = (typeof REJECTION_REASONS)[number];

export interface SourceBackfillRef {
  readonly kind: "sec_filing";
  readonly url: string;
  readonly accession: string;
  readonly form: string;
  readonly filedAt: string;
  readonly filerCik: string;
  readonly publisher: "SEC EDGAR";
  readonly retrievedAt: string;
  readonly quote: string;
  readonly dateUnverified: boolean;
}

export interface AcceptedSourceBackfillRecord {
  readonly dealId: string;
  readonly status: "accepted";
  readonly reason: null;
  readonly ref: SourceBackfillRef;
  readonly otherAcceptedCandidates: number;
}

export interface RejectedSourceBackfillRecord {
  readonly dealId: string;
  readonly status: "rejected";
  readonly reason: SourceBackfillRejectionReason;
  readonly ref: null;
  readonly otherAcceptedCandidates: 0;
}

export interface SourceBackfillErrorRecord {
  readonly dealId: string;
  readonly status: "error";
  readonly reason: null;
  readonly ref: null;
  readonly otherAcceptedCandidates: 0;
  readonly errorCode: "transport_error" | "oversized_document";
  readonly error: string;
}

export type SourceBackfillRecord =
  | AcceptedSourceBackfillRecord
  | RejectedSourceBackfillRecord
  | SourceBackfillErrorRecord;

export interface SourceBackfillReport {
  readonly generatedAt: string;
  readonly source: "SEC EDGAR full-text search";
  readonly records: readonly SourceBackfillRecord[];
}

export interface SourceBackfillCoverage {
  readonly total: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly errors: number;
  readonly transportErrors: number;
  readonly oversizedDocuments: number;
  readonly byReason: Readonly<
    Record<SourceBackfillRejectionReason, number>
  >;
}

interface CacheEntry {
  readonly url: string;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly retrievedAt: string;
  readonly error?: string;
  readonly bodyTooLarge?: boolean;
  readonly bodyBytes?: number;
}

interface EftsSource {
  readonly ciks?: readonly string[];
  readonly display_names?: readonly string[];
  readonly form?: string;
  readonly file_date?: string;
  readonly adsh?: string;
}

interface EftsHit {
  readonly source: EftsSource;
  readonly document: string;
}

interface EftsResponse {
  readonly hits?: {
    readonly hits?: ReadonlyArray<
      { readonly _id?: string; readonly _source?: EftsSource }
    >;
    readonly total?: { readonly value?: number };
  };
}

interface CompanyTickerEntry {
  readonly cik_str: number;
  readonly ticker: string;
  readonly title: string;
}

interface Candidate {
  readonly filerCik: string;
  readonly accession: string;
  readonly form: string;
  readonly filedAt: string;
  readonly primaryDocument: string;
  readonly filingUrl: string;
  readonly fullTextUrl: string;
}

interface EvaluatedCandidate {
  readonly candidate: Candidate;
  readonly ref?: SourceBackfillRef;
  readonly failure?: SourceBackfillRejectionReason;
}

export interface SourceBackfillOptions {
  readonly cacheDir: string;
  readonly userAgent: string;
  readonly offline?: boolean;
}

export function rejectionReasons(): readonly SourceBackfillRejectionReason[] {
  return REJECTION_REASONS;
}

export function normalizeCompanyName(name: string): string {
  let normalized = name
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\bs\s*\.\s*a\s*\./gu, "sa")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  const suffixes = [
    "corporation",
    "limited",
    "corporate",
    "company",
    "gmbh",
    "plc",
    "corp",
    "ltd",
    "inc",
    "llc",
    "co",
    "sa",
    "ab",
    "nv",
    "ag",
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (normalized === suffix) continue;
      if (normalized.endsWith(` ${suffix}`)) {
        normalized = normalized.slice(0, -suffix.length - 1).trim();
        changed = true;
        break;
      }
    }
  }
  return normalized;
}

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(text: string): string {
  const namedEntities: Readonly<Record<string, string>> = {
    amp: "&",
    bull: "•",
    gt: ">",
    ldquo: "“",
    lpar: "(",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    reg: "®",
    rsquo: "’",
    sect: "§",
  };
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(
      /&([a-z]+);/giu,
      (entity, name: string) =>
        namedEntities[name.toLocaleLowerCase()] ?? entity,
    )
    .replace(
      /&#(\d+);/gu,
      (_, value: string) => String.fromCodePoint(Number(value)),
    )
    .replace(
      /&#x([0-9a-f]+);/giu,
      (_, value: string) => String.fromCodePoint(Number.parseInt(value, 16)),
    );
}

function normalizeSearchTextWithMap(
  text: string,
): { value: string; sourceIndices: readonly number[] } {
  let value = "";
  const sourceIndices: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? "";
    if (/[\p{L}\p{N}]/u.test(char)) {
      if (pendingSpace && value.length > 0) {
        value += " ";
        sourceIndices.push(index);
      }
      value += char.toLocaleLowerCase();
      sourceIndices.push(index);
      pendingSpace = false;
    } else if (value.length > 0) {
      pendingSpace = true;
    }
  }
  return { value, sourceIndices };
}

function paddedCik(cik: number): string {
  return String(cik).padStart(10, "0");
}

function archiveCik(cik: string): string {
  return String(Number(cik));
}

function withoutDashes(accession: string): string {
  return accession.replaceAll("-", "");
}

function cacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

class ResponseCache {
  private lastRequestAt = 0;

  public constructor(
    private readonly directory: string,
    private readonly userAgent: string,
    private readonly offline: boolean,
  ) {
    mkdirSync(directory, { recursive: true });
  }

  public async get(url: string, accept: string): Promise<CacheEntry> {
    const key = cacheKey(url);
    const metadataPath = join(this.directory, `${key}.json`);
    const bodyPath = join(this.directory, `${key}.body`);
    if (existsSync(metadataPath)) {
      const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as
        & Omit<
          CacheEntry,
          "body"
        >
        & { readonly body?: string };
      if (existsSync(bodyPath)) {
        return {
          ...metadata,
          body: readFileSync(bodyPath, "utf8"),
        };
      }
      if (metadata.body !== undefined) {
        return metadata as CacheEntry;
      }
      if (metadata.bodyTooLarge) {
        return { ...metadata, body: "" };
      }
    }
    if (this.offline) {
      throw new Error(`Missing offline cache entry for ${url}`);
    }

    let lastError = "request failed";
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await this.pauseForRateLimit();
      try {
        const response = await fetch(url, {
          headers: {
            Accept: accept,
            "User-Agent": this.userAgent,
          },
        });
        const body = await response.text();
        const bodyBytes = Buffer.byteLength(body, "utf8");
        const entry: CacheEntry = {
          url,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: bodyBytes <= MAX_CACHED_BODY_BYTES ? body : "",
          retrievedAt: new Date().toISOString(),
          bodyBytes,
          bodyTooLarge: bodyBytes > MAX_CACHED_BODY_BYTES,
        };
        if (!response.ok && RETRYABLE_STATUSES.has(response.status)) {
          lastError = `HTTP ${response.status}`;
          if (attempt + 1 < MAX_RETRIES) {
            await sleep(2 ** attempt * 500);
            continue;
          }
        }
        const { body: cachedBody, ...metadata } = entry;
        writeFileSync(
          metadataPath,
          `${JSON.stringify(metadata, null, 2)}\n`,
          "utf8",
        );
        if (cachedBody) writeFileSync(bodyPath, cachedBody, "utf8");
        return entry;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "request failed";
        if (attempt + 1 < MAX_RETRIES) {
          await sleep(2 ** attempt * 500);
          continue;
        }
      }
    }
    const entry: CacheEntry = {
      url,
      status: 0,
      headers: {},
      body: "",
      retrievedAt: new Date().toISOString(),
      error: lastError,
    };
    writeFileSync(
      metadataPath,
      `${JSON.stringify(entry, null, 2)}\n`,
      "utf8",
    );
    return entry;
  }

  private async pauseForRateLimit(): Promise<void> {
    const waitMs = Math.max(
      0,
      REQUEST_INTERVAL_MS - (Date.now() - this.lastRequestAt),
    );
    if (waitMs > 0) await sleep(waitMs);
    this.lastRequestAt = Date.now();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class OversizedDocumentError extends Error {
  public constructor(
    public readonly url: string,
    public readonly bytes: number,
  ) {
    super(
      `SEC document exceeds ${MAX_CACHED_BODY_BYTES} byte cache limit: ${url}`,
    );
    this.name = "OversizedDocumentError";
  }
}

function assertResponse(entry: CacheEntry): string {
  if (entry.bodyTooLarge) {
    throw new OversizedDocumentError(entry.url, entry.bodyBytes ?? 0);
  }
  if (entry.status < 200 || entry.status >= 300) {
    throw new Error(
      `SEC request failed for ${entry.url}: HTTP ${entry.status}${
        entry.error ? ` (${entry.error})` : ""
      }`,
    );
  }
  return entry.body;
}

function parseEfts(body: string): {
  hits: EftsHit[];
  total: number;
} {
  const data = JSON.parse(body) as EftsResponse;
  const hits = (data.hits?.hits ?? [])
    .map((hit) => {
      const idParts = hit._id?.split(":") ?? [];
      const source = hit._source;
      if (!source || idParts.length < 2) return null;
      return {
        source,
        document: idParts.slice(1).join(":"),
      };
    })
    .filter((hit): hit is EftsHit => hit !== null);
  return {
    hits,
    total: data.hits?.total?.value ?? hits.length,
  };
}

async function loadTickerMap(
  cache: ResponseCache,
): Promise<Map<string, CompanyTickerEntry>> {
  const body = assertResponse(
    await cache.get(SEC_TICKERS_URL, "application/json"),
  );
  const data = JSON.parse(body) as Record<string, CompanyTickerEntry>;
  return new Map(
    Object.values(data).map((entry) => [entry.ticker.toUpperCase(), entry]),
  );
}

const KNOWN_PARENT_CIKS: Readonly<Record<string, number>> = {
  // Abbott Laboratories is the direct SEC filer for its acquisitions.
  "abbott laboratories": 1800,
  // Astellas Pharma Inc. is the SEC filer for the Astellas parent group.
  astellas: 1161561,
  // Bayer AG is the SEC filer for the Bayer parent group.
  bayer: 1144144,
  // Gilead Sciences, Inc. is the direct SEC filer for the Gilead group.
  "gilead sciences": 882095,
  // KKR & Co. Inc. is the SEC filer for the KKR parent group.
  "kkr": 1404912,
  // Revvity, formerly PerkinElmer, is the successor SEC filer for that parent.
  "perkinelmer revvity": 31791,
  // Pfizer Inc. is the direct SEC filer for the Pfizer parent group.
  pfizer: 78003,
  // Siemens Healthineers AG is the SEC filer for the Siemens Healthineers group.
  "siemens healthineers": 1130866,
};

function resolveAcquirer(
  acquirer: VerifiedAcquirer,
  tickers: ReadonlyMap<string, CompanyTickerEntry>,
): string | undefined {
  if (acquirer.ticker) {
    const entry = tickers.get(acquirer.ticker.toUpperCase());
    if (entry) return paddedCik(entry.cik_str);
  }
  const normalized = normalizeCompanyName(acquirer.name);
  const known = KNOWN_PARENT_CIKS[normalized];
  return known ? paddedCik(known) : undefined;
}

function buildSearchUrl(
  targetName: string,
  filerCik: string,
  offset = 0,
): string {
  const params = new URLSearchParams({
    q: `"${targetName}"`,
    dateRange: "custom",
    startdt: FULL_TEXT_START,
    enddt: FULL_TEXT_END,
    ciks: filerCik,
    from: String(offset),
    size: "100",
  });
  return `${EFTS_URL}?${params.toString()}`;
}

async function searchCandidates(
  cache: ResponseCache,
  targetName: string,
  filerCik: string,
): Promise<Candidate[]> {
  const firstUrl = buildSearchUrl(targetName, filerCik);
  const first = parseEfts(
    assertResponse(await cache.get(firstUrl, "application/json")),
  );
  const allHits = [...first.hits];
  for (let offset = 100; offset < first.total; offset += 100) {
    const url = buildSearchUrl(targetName, filerCik, offset);
    const page = parseEfts(
      assertResponse(await cache.get(url, "application/json")),
    );
    allHits.push(...page.hits);
  }
  return allHits
    .filter((hit) => {
      const ciks = hit.source.ciks ?? [];
      return ciks.map((cik) => paddedCik(Number(cik))).includes(filerCik);
    })
    .map((hit): Candidate | null => {
      const accession = hit.source.adsh ?? "";
      const form = hit.source.form ?? "";
      const filedAt = hit.source.file_date ?? "";
      if (!accession || !form || !filedAt) return null;
      const primaryDocument = hit.document;
      const base = `${SEC_ARCHIVES_BASE}/${archiveCik(filerCik)}/${
        withoutDashes(accession)
      }`;
      return {
        filerCik,
        accession,
        form,
        filedAt,
        primaryDocument,
        filingUrl: `${base}/${primaryDocument}`,
        fullTextUrl: `${base}/${primaryDocument}`,
      };
    })
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((a, b) =>
      a.filedAt.localeCompare(b.filedAt) ||
      a.accession.localeCompare(b.accession) ||
      a.form.localeCompare(b.form) ||
      a.primaryDocument.localeCompare(b.primaryDocument)
    );
}

function formRank(form: string): number {
  if (form === "8-K") return 0;
  if (form === "10-K" || form === "10-Q" || form === "20-F" || form === "6-K") {
    return 2;
  }
  return 3;
}

function dateInRange(
  filedAt: string,
  announcedDate: string | undefined,
): boolean {
  if (!announcedDate) return true;
  const announced = new Date(`${announcedDate}T00:00:00Z`).getTime();
  const filed = new Date(`${filedAt}T00:00:00Z`).getTime();
  return filed >= announced - 30 * 24 * 60 * 60 * 1000 &&
    filed <= announced + 400 * 24 * 60 * 60 * 1000;
}

function filingTextQuote(
  text: string,
  targetName: string,
): { quote: string; matched: boolean } {
  const target = normalizeCompanyName(targetName);
  const normalized = normalizeSearchTextWithMap(text);
  const index = normalized.value.indexOf(target);
  const leftBoundary = index < 0 ||
    (index > 0 && normalized.value[index - 1] !== " ");
  const rightIndex = index < 0 ? -1 : index + target.length;
  const rightBoundary = rightIndex < 0 ||
    (rightIndex < normalized.value.length &&
      normalized.value[rightIndex] !== " ");
  if (index < 0 || leftBoundary || rightBoundary) {
    return { quote: "", matched: false };
  }

  const sourceIndex = normalized.sourceIndices[index] ?? 0;
  const sourceEndIndex = normalized.sourceIndices[index + target.length - 1] ??
    sourceIndex;
  const start = Math.max(0, sourceIndex - 100);
  const end = Math.min(
    text.length,
    Math.max(
      sourceEndIndex + 100,
      start + target.length,
    ),
  );
  return {
    quote: text.slice(start, Math.min(end, start + 300)).trim(),
    matched: true,
  };
}

export function extractSourceQuote(
  filingText: string,
  targetName: string,
): string | undefined {
  const result = filingTextQuote(filingText, targetName);
  return result.matched ? result.quote : undefined;
}

export function hasAdjacentTargetMatch(
  filingText: string,
  targetName: string,
): boolean {
  return filingTextQuote(filingText, targetName).matched;
}

function containsTransactionLanguage(text: string): boolean {
  const normalized = normalizeSearchText(text);
  return TRANSACTION_TERMS.some((term) =>
    normalized.includes(normalizeSearchText(term))
  );
}

function evaluateCandidate(
  candidate: Candidate,
  filingText: string,
  retrievedAt: string,
  targetName: string,
  announcedDate: string | undefined,
): EvaluatedCandidate {
  const quote = filingTextQuote(filingText, targetName);
  if (!quote.matched) {
    return { candidate, failure: "target_name_not_matched" };
  }
  if (!containsTransactionLanguage(filingText)) {
    return { candidate, failure: "no_transaction_language" };
  }
  if (!dateInRange(candidate.filedAt, announcedDate)) {
    return { candidate, failure: "date_out_of_range" };
  }
  if (
    !quote.quote ||
    !normalizeSearchText(quote.quote).includes(normalizeCompanyName(targetName))
  ) {
    return { candidate, failure: "no_quote_extractable" };
  }
  return {
    candidate,
    ref: {
      kind: "sec_filing",
      url: candidate.filingUrl,
      accession: candidate.accession,
      form: candidate.form,
      filedAt: candidate.filedAt,
      filerCik: candidate.filerCik,
      publisher: "SEC EDGAR",
      retrievedAt,
      quote: quote.quote,
      dateUnverified: announcedDate === undefined,
    },
  };
}

async function evaluateDeal(
  deal: VerifiedAcquisition,
  acquirer: VerifiedAcquirer | undefined,
  cache: ResponseCache,
  tickers: ReadonlyMap<string, CompanyTickerEntry>,
): Promise<SourceBackfillRecord> {
  if (deal.announcedDate < FULL_TEXT_START) {
    return {
      dealId: deal.id,
      status: "rejected",
      reason: "no_fulltext_coverage",
      ref: null,
      otherAcceptedCandidates: 0,
    };
  }
  if (!acquirer) {
    return {
      dealId: deal.id,
      status: "error",
      reason: null,
      ref: null,
      otherAcceptedCandidates: 0,
      errorCode: "transport_error",
      error: `Acquirer ${deal.acquirerId} is missing from the dataset`,
    };
  }
  const filerCik = resolveAcquirer(acquirer, tickers);
  if (!filerCik) {
    return {
      dealId: deal.id,
      status: "rejected",
      reason: "acquirer_not_a_filer",
      ref: null,
      otherAcceptedCandidates: 0,
    };
  }

  const candidates = await searchCandidates(cache, deal.targetName, filerCik);
  if (candidates.length === 0) {
    return {
      dealId: deal.id,
      status: "rejected",
      reason: "no_hit",
      ref: null,
      otherAcceptedCandidates: 0,
    };
  }

  const evaluated: EvaluatedCandidate[] = [];
  let operationalError:
    | { code: "transport_error" | "oversized_document"; message: string }
    | undefined;
  for (const candidate of candidates) {
    try {
      const textEntry = await cache.get(candidate.fullTextUrl, "text/html");
      const filingText = stripHtml(assertResponse(textEntry));
      evaluated.push(
        evaluateCandidate(
          candidate,
          filingText,
          textEntry.retrievedAt,
          deal.targetName,
          deal.announcedDate,
        ),
      );
    } catch (error) {
      operationalError = {
        code: error instanceof OversizedDocumentError
          ? "oversized_document"
          : "transport_error",
        message: error instanceof Error ? error.message : "SEC document failed",
      };
    }
  }
  const accepted = evaluated
    .filter((
      candidate,
    ): candidate is EvaluatedCandidate & { ref: SourceBackfillRef } =>
      candidate.ref !== undefined
    )
    .sort((a, b) =>
      formRank(a.candidate.form) - formRank(b.candidate.form) ||
      a.candidate.filedAt.localeCompare(b.candidate.filedAt) ||
      a.candidate.accession.localeCompare(b.candidate.accession)
    );
  if (accepted.length > 0) {
    const best = accepted[0];
    return {
      dealId: deal.id,
      status: "accepted",
      reason: null,
      ref: best.ref,
      otherAcceptedCandidates: accepted.length - 1,
    };
  }
  if (operationalError) {
    return {
      dealId: deal.id,
      status: "error",
      reason: null,
      ref: null,
      otherAcceptedCandidates: 0,
      errorCode: operationalError.code,
      error: operationalError.message,
    };
  }
  const failure =
    evaluated.find((candidate) =>
      candidate.failure === "target_name_not_matched"
    )
      ?.failure ??
      evaluated.find((candidate) =>
        candidate.failure === "no_transaction_language"
      )
        ?.failure ??
      evaluated.find((candidate) => candidate.failure === "date_out_of_range")
        ?.failure ??
      evaluated.find((candidate) =>
        candidate.failure === "no_quote_extractable"
      )
        ?.failure ??
      "no_hit";
  return {
    dealId: deal.id,
    status: "rejected",
    reason: failure,
    ref: null,
    otherAcceptedCandidates: 0,
  };
}

export async function runSourceBackfill(
  dataset: VerifiedDataset,
  options: SourceBackfillOptions,
): Promise<SourceBackfillReport> {
  const cache = new ResponseCache(
    options.cacheDir,
    options.userAgent,
    options.offline ?? false,
  );
  const tickers = await loadTickerMap(cache);
  const acquirers = new Map(
    dataset.acquirers.map((acquirer) => [acquirer.id, acquirer]),
  );
  const records: SourceBackfillRecord[] = [];
  for (const deal of dataset.acquisitions) {
    try {
      records.push(
        await evaluateDeal(
          deal,
          acquirers.get(deal.acquirerId),
          cache,
          tickers,
        ),
      );
    } catch (error) {
      records.push({
        dealId: deal.id,
        status: "error",
        reason: null,
        ref: null,
        otherAcceptedCandidates: 0,
        errorCode: "transport_error",
        error: error instanceof Error
          ? error.message
          : "source backfill failed",
      });
    }
  }
  return {
    generatedAt: "deterministic-from-cache",
    source: "SEC EDGAR full-text search",
    records,
  };
}

export function summarizeSourceBackfill(
  report: SourceBackfillReport,
): SourceBackfillCoverage {
  const byReason = Object.fromEntries(
    REJECTION_REASONS.map((reason) => [reason, 0]),
  ) as Record<SourceBackfillRejectionReason, number>;
  let accepted = 0;
  let rejected = 0;
  let errors = 0;
  let transportErrors = 0;
  let oversizedDocuments = 0;
  for (const record of report.records) {
    if (record.status === "accepted") accepted++;
    else if (record.status === "rejected") {
      rejected++;
      byReason[record.reason]++;
    } else {
      errors++;
      if (record.errorCode === "oversized_document") oversizedDocuments++;
      else transportErrors++;
    }
  }
  return {
    total: report.records.length,
    accepted,
    rejected,
    errors,
    transportErrors,
    oversizedDocuments,
    byReason,
  };
}

export function sourceBackfillCoverageText(
  coverage: SourceBackfillCoverage,
): string {
  const lines = [
    `Accepted: ${coverage.accepted} / ${coverage.total}`,
    `Rejected: ${coverage.rejected}`,
    `Transport/configuration errors: ${coverage.transportErrors}`,
    `Oversized documents: ${coverage.oversizedDocuments}`,
    "Rejected by reason:",
  ];
  for (const reason of REJECTION_REASONS) {
    lines.push(`  ${reason}: ${coverage.byReason[reason]}`);
  }
  return lines.join("\n");
}
