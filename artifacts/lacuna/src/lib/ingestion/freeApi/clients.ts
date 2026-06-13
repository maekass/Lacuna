/**
 * Thin fetch wrappers for free public APIs used by Lacuna enrichment.
 * Server/CLI only — respect each provider's rate limits and attribution rules.
 */

import process from "node:process";
import {
  loadSecTickerMap,
  padCik,
  resolveTicker,
} from "@/lib/ingestion/secEdgarClient";
import { DELAY_MS, sleep } from "./rateLimit";
import type { FreeApiSourceId, FreeApiSourceResult } from "./types";

const SEC_DATA_BASE = "https://data.sec.gov";
const CTG_API = "https://clinicaltrials.gov/api/v2";
const OPENFDA_BASE = "https://api.fda.gov";
const NIH_REPORTER = "https://api.reporter.nih.gov/v2/projects/search";
const NCBI_ESEARCH =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PATENTSVIEW_SEARCH = "https://search.patentsview.org/api/v1/patent/";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const EU_CTR_SPONSOR =
  "https://www.clinicaltrialsregister.eu/ctr-search/rest/feed/by/sponsor";

function secUserAgent(): string {
  const ua = process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (!ua) {
    throw new Error(
      'SEC_EDGAR_USER_AGENT is required for SEC downloads. Example: "Lacuna Research mps5cy@virginia.edu"',
    );
  }
  return ua;
}

function ncbiEmail(): string {
  return process.env.NCBI_TOOL_EMAIL?.trim() || "mps5cy@virginia.edu";
}

function okResult(
  source: FreeApiSourceId,
  url: string,
  data: unknown,
): FreeApiSourceResult {
  return { source, ok: true, fetchedAt: new Date().toISOString(), url, data };
}

function errResult(
  source: FreeApiSourceId,
  url: string | undefined,
  error: string,
): FreeApiSourceResult {
  return {
    source,
    ok: false,
    fetchedAt: new Date().toISOString(),
    url,
    error,
  };
}

function secJsonFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": secUserAgent(),
    },
  });
}

/** SEC submissions metadata (public filers with a resolved ticker). */
export async function fetchSecSubmissions(
  ticker: string,
): Promise<FreeApiSourceResult> {
  const entry = await resolveTicker(ticker);
  if (!entry) {
    return errResult(
      "sec_submissions",
      undefined,
      `No SEC CIK for ticker ${ticker}`,
    );
  }
  const url = `${SEC_DATA_BASE}/submissions/CIK${padCik(entry.cik)}.json`;
  try {
    const res = await secJsonFetch(url);
    if (!res.ok) {
      return errResult("sec_submissions", url, `HTTP ${res.status}`);
    }
    const raw = await res.json() as Record<string, unknown>;
    const recent = (raw.filings as { recent?: Record<string, string[]> })
      ?.recent;
    const trimmed = {
      cik: entry.cik,
      ticker: entry.ticker,
      name: raw.name,
      sic: raw.sic,
      sicDescription: raw.sicDescription,
      recentFilingCount: recent?.form?.length ?? 0,
      recentForms: recent?.form?.slice(0, 20) ?? [],
      recentFilingDates: recent?.filingDate?.slice(0, 20) ?? [],
    };
    await sleep(DELAY_MS.sec);
    return okResult("sec_submissions", url, trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SEC submissions failed";
    return errResult("sec_submissions", url, msg);
  }
}

/** SEC XBRL company facts — revenue, assets, etc. for public filers. */
export async function fetchSecCompanyFacts(
  ticker: string,
): Promise<FreeApiSourceResult> {
  const entry = await resolveTicker(ticker);
  if (!entry) {
    return errResult(
      "sec_company_facts",
      undefined,
      `No SEC CIK for ticker ${ticker}`,
    );
  }
  const url = `${SEC_DATA_BASE}/api/xbrl/companyfacts/CIK${
    padCik(entry.cik)
  }.json`;
  try {
    const res = await secJsonFetch(url);
    if (!res.ok) {
      return errResult("sec_company_facts", url, `HTTP ${res.status}`);
    }
    const raw = await res.json() as {
      entityName?: string;
      facts?: {
        "us-gaap"?: Record<
          string,
          { units?: Record<string, Array<{ end: string; val: number }>> }
        >;
      };
    };
    const gaap = raw.facts?.["us-gaap"] ?? {};
    const pick = (key: string) =>
      gaap[key]?.units?.USD?.slice(-4) ??
        gaap[key]?.units?.["USD/shares"]?.slice(-4) ??
        [];
    const summary = {
      entityName: raw.entityName,
      revenues: pick("Revenues"),
      revenueFromContract: pick(
        "RevenueFromContractWithCustomerExcludingAssessedTax",
      ),
      assets: pick("Assets"),
      operatingIncome: pick("OperatingIncomeLoss"),
    };
    await sleep(DELAY_MS.sec);
    return okResult("sec_company_facts", url, summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SEC company facts failed";
    return errResult("sec_company_facts", url, msg);
  }
}

/** ClinicalTrials.gov studies sponsored by company name. */
export async function fetchClinicalTrialsGov(
  companyName: string,
): Promise<FreeApiSourceResult> {
  const params = new URLSearchParams({
    "query.spons": companyName,
    pageSize: "25",
    sort: "LastUpdatePostDate:desc",
  });
  const url = `${CTG_API}/studies?${params}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return errResult("clinical_trials_gov", url, `HTTP ${res.status}`);
    }
    const data = await res.json();
    await sleep(DELAY_MS.default);
    return okResult("clinical_trials_gov", url, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClinicalTrials.gov failed";
    return errResult("clinical_trials_gov", url, msg);
  }
}

/** openFDA device 510(k) + drug approvals by applicant/sponsor name. */
export async function fetchOpenFda(
  companyName: string,
): Promise<FreeApiSourceResult> {
  const encoded = encodeURIComponent(`"${companyName}"`);
  const deviceUrl =
    `${OPENFDA_BASE}/device/510k.json?search=applicant:${encoded}&limit=10`;
  const drugUrl =
    `${OPENFDA_BASE}/drug/drugsfda.json?search=sponsor_name:${encoded}&limit=10`;
  try {
    const [deviceRes, drugRes] = await Promise.all([
      fetch(deviceUrl, { headers: { Accept: "application/json" } }),
      fetch(drugUrl, { headers: { Accept: "application/json" } }),
    ]);
    const deviceJson = deviceRes.ok ? await deviceRes.json() : { results: [] };
    const drugJson = drugRes.ok ? await drugRes.json() : { results: [] };
    await sleep(DELAY_MS.openFda);
    return okResult("openfda", deviceUrl, {
      devices: deviceJson.results ?? [],
      drugs: drugJson.results ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "openFDA failed";
    return errResult("openfda", deviceUrl, msg);
  }
}

/** NIH RePORTER grants for organization name. */
export async function fetchNihReporter(
  orgName: string,
): Promise<FreeApiSourceResult> {
  const url = NIH_REPORTER;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        criteria: { org_names: [orgName] },
        limit: 25,
        offset: 0,
      }),
    });
    if (!res.ok) return errResult("nih_reporter", url, `HTTP ${res.status}`);
    const data = await res.json();
    await sleep(DELAY_MS.default);
    return okResult("nih_reporter", url, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "NIH RePORTER failed";
    return errResult("nih_reporter", url, msg);
  }
}

/** PubMed publication IDs (esearch) — affiliation match. */
export async function fetchPubMedIds(
  companyName: string,
): Promise<FreeApiSourceResult> {
  const term = encodeURIComponent(`${companyName}[Affiliation]`);
  const params = new URLSearchParams({
    db: "pubmed",
    term,
    retmode: "json",
    retmax: "25",
    tool: "lacuna",
    email: ncbiEmail(),
  });
  const url = `${NCBI_ESEARCH}?${params}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return errResult("pubmed", url, `HTTP ${res.status}`);
    const data = await res.json();
    await sleep(DELAY_MS.ncbi);
    return okResult("pubmed", url, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PubMed esearch failed";
    return errResult("pubmed", url, msg);
  }
}

/**
 * PatentsView search by assignee — optional PATENTSVIEW_API_KEY (free registration).
 * @see https://search.patentsview.org/
 */
export async function fetchPatentsView(
  companyName: string,
): Promise<FreeApiSourceResult> {
  const apiKey = process.env.PATENTSVIEW_API_KEY?.trim();
  if (!apiKey) {
    return errResult(
      "patentsview",
      undefined,
      "Skipped — set PATENTSVIEW_API_KEY (free at search.patentsview.org)",
    );
  }
  const url = PATENTSVIEW_SEARCH;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q: { _assignee_name: companyName },
        f: [
          "patent_id",
          "patent_title",
          "patent_date",
          "assignees.assignee_organization",
        ],
        o: { size: 15 },
      }),
    });
    if (!res.ok) {
      return errResult("patentsview", url, `HTTP ${res.status}`);
    }
    const data = await res.json();
    await sleep(DELAY_MS.default);
    return okResult("patentsview", url, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PatentsView failed";
    return errResult("patentsview", url, msg);
  }
}

/** Wikidata entity search — lightweight entity resolution helper. */
export async function fetchWikidataSearch(
  companyName: string,
): Promise<FreeApiSourceResult> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: companyName,
    language: "en",
    format: "json",
    limit: "5",
  });
  const url = `${WIKIDATA_API}?${params}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "LacunaResearch/1.0 (educational; +https://github.com/maekass/Lacuna)",
      },
    });
    if (!res.ok) return errResult("wikidata", url, `HTTP ${res.status}`);
    const data = await res.json();
    await sleep(DELAY_MS.default);
    return okResult("wikidata", url, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Wikidata failed";
    return errResult("wikidata", url, msg);
  }
}

/** EU Clinical Trials Register — sponsor feed (may be slow or empty). */
export async function fetchEuClinicalTrials(
  companyName: string,
): Promise<FreeApiSourceResult> {
  const url = `${EU_CTR_SPONSOR}?query=${encodeURIComponent(companyName)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/xml, application/json" },
    });
    if (!res.ok) {
      return errResult("eu_clinical_trials", url, `HTTP ${res.status}`);
    }
    const text = await res.text();
    await sleep(DELAY_MS.default);
    return okResult("eu_clinical_trials", url, {
      contentType: res.headers.get("content-type"),
      byteLength: text.length,
      preview: text.slice(0, 2000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "EU CTR failed";
    return errResult("eu_clinical_trials", url, msg);
  }
}

/** Preload SEC ticker map before batch SEC calls. */
export async function preloadSecTickerMap(): Promise<void> {
  await loadSecTickerMap();
}

export const ALL_FREE_API_SOURCES: FreeApiSourceId[] = [
  "sec_submissions",
  "sec_company_facts",
  "clinical_trials_gov",
  "openfda",
  "nih_reporter",
  "pubmed",
  "patentsview",
  "wikidata",
  "eu_clinical_trials",
];
