#!/usr/bin/env npx tsx

/**
 * SEC 10-K Revenue Fetcher
 *
 * MeshIC guardrail: SEC facts are accepted only after the CIK resolves to an
 * expected registrant identity. This prevents a stale/incorrect hard-coded CIK
 * from silently assigning another issuer's revenue to a Lacuna company.
 */

import { readFileSync, writeFileSync } from "fs";

interface Company {
  id: string;
  name: string;
}

interface Acquisition {
  targetId: string;
  announcedDate: string;
}

interface SecRevenueEntry {
  fp: string;
  form: string;
  fy: string;
  end: string;
  val: number;
}

interface SecRevenueFactsResponse {
  units?: Record<string, SecRevenueEntry[]>;
}

interface SecSubmissionResponse {
  name?: string;
  tickers?: string[];
}

interface SecRevenueRecord {
  companyId: string;
  companyName: string;
  cik: string;
  ticker?: string;
  fiscalYear: number;
  revenue: number;
  source: string;
  filingUrl: string;
  filingType: string;
}

interface CikEntry {
  cik: string;
  ticker?: string;
  /** Names accepted from SEC submissions metadata after normalization. */
  registrantAliases: string[];
}

// CIKs are identifiers, not descriptive metadata. Every mapping is validated
// against SEC submissions before facts are ingested. Confirmed corrections in
// this audit: Seagen=1060736, Gen-Probe=820237, Hologic=859737,
// Exact Sciences=1124140, Illumina=1110803, Cooper Companies=711404.
const COMPANY_CIK_MAP: Record<string, CikEntry> = {
  "Talkspace": { cik: "0001835825", ticker: "TALK", registrantAliases: ["Talkspace Inc"] },
  "Livongo Health": { cik: "0001720261", ticker: "LVGO", registrantAliases: ["Livongo Health Inc"] },
  "Sequenom": { cik: "0001075610", ticker: "SQNM", registrantAliases: ["Sequenom Inc"] },
  "Genomic Health": { cik: "0001273108", ticker: "GHDX", registrantAliases: ["Genomic Health Inc"] },
  "Foundation Medicine": { cik: "0001573773", ticker: "FMI", registrantAliases: ["Foundation Medicine Inc"] },
  "GRAIL": { cik: "0001834236", ticker: "GRAL", registrantAliases: ["Grail Inc"] },
  "Seagen": { cik: "0001060736", ticker: "SGEN", registrantAliases: ["Seagen Inc", "Seattle Genetics Inc"] },
  "Varian Medical Systems": { cik: "0000002034", ticker: "VAR", registrantAliases: ["Varian Medical Systems Inc"] },
  "Immunomedics": { cik: "0000839016", ticker: "IMMU", registrantAliases: ["Immunomedics Inc"] },
  "Alere": { cik: "0001145460", ticker: "ALR", registrantAliases: ["Alere Inc", "Inverness Medical Innovations Inc"] },
  "Gen-Probe": { cik: "0000820237", ticker: "GPRO", registrantAliases: ["Gen Probe Inc", "Gen-Probe Inc", "Gen-Probe Incorporated"] },
  "Myovant Sciences": { cik: "0001679082", ticker: "MYOV", registrantAliases: ["Myovant Sciences Ltd"] },
  "Hologic": { cik: "0000859737", ticker: "HOLX", registrantAliases: ["Hologic Inc"] },
  "CooperSurgical": { cik: "0000711404", ticker: "COO", registrantAliases: ["Cooper Companies Inc", "The Cooper Companies Inc"] },
  "Organon": { cik: "0001821825", ticker: "OGN", registrantAliases: ["Organon & Co", "Organon & Co."] },
  "Exact Sciences": { cik: "0001124140", ticker: "EXAS", registrantAliases: ["Exact Sciences Corp", "Exact Sciences Corporation"] },
  "Illumina": { cik: "0001110803", ticker: "ILMN", registrantAliases: ["Illumina Inc"] },
  "PerkinElmer": { cik: "0000031791", ticker: "PKI", registrantAliases: ["Perkinelmer Inc", "Revvity Inc"] },
  "Abbott Laboratories": { cik: "0000001800", ticker: "ABT", registrantAliases: ["Abbott Laboratories"] },
  "Gilead Sciences": { cik: "0000882095", ticker: "GILD", registrantAliases: ["Gilead Sciences Inc"] },
  "Pfizer": { cik: "0000078003", ticker: "PFE", registrantAliases: ["Pfizer Inc"] },
  "LabCorp": { cik: "0000920148", ticker: "LH", registrantAliases: ["Laboratory Corp of America Holdings", "Labcorp Holdings Inc"] },
  "Natera": { cik: "0001604821", ticker: "NTRA", registrantAliases: ["Natera Inc"] },
  "Myriad Genetics": { cik: "0000899923", ticker: "MYGN", registrantAliases: ["Myriad Genetics Inc"] },
  "Medtronic": { cik: "0001613103", ticker: "MDT", registrantAliases: ["Medtronic plc"] },
  "Boston Scientific": { cik: "0000885725", ticker: "BSX", registrantAliases: ["Boston Scientific Corp", "Boston Scientific Corporation"] },
};

const SEC_USER_AGENT = "Lacuna-Research research@lacuna.health";
const SEC_FACTS_BASE = "https://data.sec.gov/api/xbrl/companyconcept";
const SEC_SUBMISSIONS_BASE = "https://data.sec.gov/submissions";
const REVENUE_CONCEPTS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
] as const;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function validateRegistrant(entry: CikEntry): Promise<{ ok: boolean; secName: string | null }> {
  const url = `${SEC_SUBMISSIONS_BASE}/CIK${entry.cik}.json`;
  const response = await fetch(url, { headers: { "User-Agent": SEC_USER_AGENT } });
  if (!response.ok) return { ok: false, secName: null };

  const data = await response.json() as SecSubmissionResponse;
  const secName = data.name?.trim() || null;
  if (!secName) return { ok: false, secName };

  const normalizedSec = normalizeName(secName);
  const ok = entry.registrantAliases.some((alias) => {
    const normalizedAlias = normalizeName(alias);
    return normalizedSec === normalizedAlias || normalizedSec.includes(normalizedAlias) || normalizedAlias.includes(normalizedSec);
  });
  return { ok, secName };
}

async function fetchRevenueConcept(cik: string, concept: string): Promise<SecRevenueFactsResponse | null> {
  const url = `${SEC_FACTS_BASE}/CIK${cik}/us-gaap/${concept}.json`;
  const response = await fetch(url, { headers: { "User-Agent": SEC_USER_AGENT } });
  if (!response.ok) return null;
  return await response.json() as SecRevenueFactsResponse;
}

function parseRevenueData(data: SecRevenueFactsResponse, cik: string): SecRevenueRecord[] {
  const usdData = data.units?.USD || data.units?.usd;
  if (!usdData || !Array.isArray(usdData)) return [];

  const byYear = new Map<number, SecRevenueEntry>();
  for (const entry of usdData) {
    if (entry.fp !== "FY" || entry.form !== "10-K") continue;
    const year = Number.parseInt(entry.fy, 10);
    if (!Number.isFinite(year)) continue;
    const existing = byYear.get(year);
    if (!existing || entry.end > existing.end) byYear.set(year, entry);
  }

  return [...byYear.entries()].map(([year, entry]) => ({
    companyId: "",
    companyName: "",
    cik,
    fiscalYear: year,
    revenue: Number((entry.val / 1_000_000).toFixed(1)),
    source: `SEC EDGAR 10-K filing (CIK ${cik}, FY${year})`,
    filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K&dateb=&owner=include&count=10`,
    filingType: "10-K",
  })).sort((a, b) => b.fiscalYear - a.fiscalYear);
}

async function fetchRevenueForCompany(cik: string): Promise<SecRevenueRecord[]> {
  for (const concept of REVENUE_CONCEPTS) {
    try {
      const data = await fetchRevenueConcept(cik, concept);
      if (!data) continue;
      const records = parseRevenueData(data, cik);
      if (records.length > 0) return records;
    } catch (error) {
      console.warn(`  ⚠️ Error fetching ${concept} for CIK ${cik}: ${String(error)}`);
    }
  }
  return [];
}

function acquisitionYearByTarget(acquisitions: Acquisition[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const deal of acquisitions) {
    const year = Number.parseInt(deal.announcedDate.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const prior = result.get(deal.targetId);
    if (prior === undefined || year < prior) result.set(deal.targetId, year);
  }
  return result;
}

async function collectEntityRevenue(
  company: Company,
  entry: CikEntry,
  acquiredYear?: number,
): Promise<SecRevenueRecord[]> {
  const identity = await validateRegistrant(entry);
  if (!identity.ok) {
    console.error(`  ⛔ CIK identity mismatch: ${company.name} -> ${entry.cik} resolved to ${identity.secName ?? "unknown"}; skipped`);
    return [];
  }

  const records = await fetchRevenueForCompany(entry.cik);
  const bounded = acquiredYear === undefined
    ? records
    : records.filter((record) => record.fiscalYear <= acquiredYear);

  return bounded.map((record) => ({
    ...record,
    companyId: company.id,
    companyName: company.name,
    ...(entry.ticker ? { ticker: entry.ticker } : {}),
  }));
}

async function main() {
  console.log("🔍 Fetching SEC 10-K revenue data with registrant validation...\n");

  const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
  const companies: Company[] = dataset.companies || [];
  const acquirers: Company[] = dataset.acquirers || [];
  const acquisitions: Acquisition[] = dataset.acquisitions || [];
  const acquiredYears = acquisitionYearByTarget(acquisitions);
  const allResults: SecRevenueRecord[] = [];

  for (const company of companies) {
    const entry = COMPANY_CIK_MAP[company.name];
    if (!entry) continue;
    await new Promise((resolve) => setTimeout(resolve, 150));
    allResults.push(...await collectEntityRevenue(company, entry, acquiredYears.get(company.id)));
  }

  for (const acquirer of acquirers) {
    const entry = COMPANY_CIK_MAP[acquirer.name];
    if (!entry) continue;
    await new Promise((resolve) => setTimeout(resolve, 150));
    allResults.push(...await collectEntityRevenue(acquirer, entry));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "SEC EDGAR XBRL CompanyConcept API + SEC submissions identity validation",
    userAgent: SEC_USER_AGENT,
    method: "Annual 10-K revenue facts are accepted only after SEC submissions metadata confirms the mapped registrant identity. Standalone target-company histories are bounded at the acquisition-announcement year.",
    totalRecords: allResults.length,
    companies: [...new Set(allResults.map((record) => record.companyName))],
    records: allResults,
  };

  writeFileSync("src/data/computed-sec-revenue.json", JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✅ SEC revenue data written: ${allResults.length} records for ${output.companies.length} entities`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
