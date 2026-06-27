#!/usr/bin/env npx tsx

/**
 * SEC 10-K Revenue Fetcher
 *
 * Fetches actual annual revenue from SEC EDGAR 10-K filings for companies
 * that are (or were) publicly traded. Uses the SEC EDGAR full-text search API
 * and the company facts API to get reported revenue.
 *
 * API docs:
 *   https://www.sec.gov/edgar/sec-api-documentation
 *   Company facts: https://data.sec.gov/api/xbrl/companyconcept/CIK/{cik}/us-gaap/Revenues.json
 *
 * Output: src/data/computed-sec-revenue.json
 *
 * Usage: npx tsx scripts/fetch-sec-revenue.ts
 */

import { writeFileSync, readFileSync } from "fs";

interface Company {
  id: string;
  name: string;
  sector: string;
  stage?: string;
  lastKnownValuation?: number;
  totalFunding?: number;
  sources?: string[];
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

interface SecRevenueRecord {
  companyId: string;
  companyName: string;
  cik: string;
  ticker?: string;
  fiscalYear: number;
  revenue: number; // in millions USD
  source: string;
  filingUrl: string;
  filingType: string;
}
// Source: SEC EDGAR company search (https://www.sec.gov/cgi-bin/browse-edgar)
const COMPANY_CIK_MAP: Record<string, { cik: string; ticker?: string }> = {
  "Talkspace": { cik: "0001835825", ticker: "TALK" },
  "Livongo Health": { cik: "0001720261", ticker: "LVGO" },
  "Sequenom": { cik: "0001082113", ticker: "SQNM" },
  "Genomic Health": { cik: "0001273108", ticker: "GHDX" },
  "Foundation Medicine": { cik: "0001573773", ticker: "FMI" },
  "GRAIL": { cik: "0001834236", ticker: "GRAL" },
  "Seagen": { cik: "0001145197", ticker: "SGEN" },
  "Varian Medical Systems": { cik: "0000008732", ticker: "VAR" },
  "Immunomedics": { cik: "0000839016", ticker: "IMMU" },
  "Alere": { cik: "0001333247", ticker: "ALR" },
  "Gen-Probe": { cik: "0001045609", ticker: "GPRO" },
  "Myovant Sciences": { cik: "0001681115", ticker: "MYOV" },
  "Hologic": { cik: "0001000228", ticker: "HOLX" },
  "CooperSurgical": { cik: "0001000228", ticker: "COO" }, // Cooper Companies parent
  "Organon": { cik: "0001810848", ticker: "OGN" },
  "Roche": { cik: "0000011128" }, // Roche Holding (FMI parent)
  "Exact Sciences": { cik: "0001260221", ticker: "EXAS" },
  "Illumina": { cik: "0001000228", ticker: "ILMN" },
  "PerkinElmer": { cik: "0000003179", ticker: "PKI" },
  "Abbott Laboratories": { cik: "0000001800", ticker: "ABT" },
  "Siemens Healthineers": { cik: "0001734511" },
  "Gilead Sciences": { cik: "0000882095", ticker: "GILD" },
  "Pfizer": { cik: "0000078003", ticker: "PFE" },
  "Bayer": { cik: "0000003179" },
  "Astellas Pharma": { cik: "0001280502" },
  "LabCorp": { cik: "0001364743", ticker: "LH" },
  "Natera": { cik: "0001531150", ticker: "NTRA" },
  "Myriad Genetics": { cik: "0001097149", ticker: "MYGN" },
  "Medtronic": { cik: "0001613103", ticker: "MDT" },
  "Boston Scientific": { cik: "0000885725", ticker: "BSX" },
};

const SEC_USER_AGENT = "Lacuna-Research research@lacuna.health";
const SEC_FACTS_BASE = "https://data.sec.gov/api/xbrl/companyconcept";

async function fetchRevenueForCompany(cik: string): Promise<SecRevenueRecord[]> {
  const results: SecRevenueRecord[] = [];

  try {
    // Try us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax first
    const url = `${SEC_FACTS_BASE}/CIK${cik}/us-gaap/Revenues.json`;
    const response = await fetch(url, {
      headers: { "User-Agent": SEC_USER_AGENT },
    });

    if (!response.ok) {
      // Fallback to RevenueFromContractWithCustomer
      const altUrl = `${SEC_FACTS_BASE}/CIK${cik}/us-gaap/RevenueFromContractWithCustomerExcludingAssessedTax.json`;
      const altResponse = await fetch(altUrl, {
        headers: { "User-Agent": SEC_USER_AGENT },
      });

      if (!altResponse.ok) {
        console.warn(`  ⚠️  No revenue data for CIK ${cik} (${response.status})`);
        return [];
      }

      const data = await altResponse.json() as SecRevenueFactsResponse;
      return parseRevenueData(data, cik);
    }

    const data = await response.json() as SecRevenueFactsResponse;
    return parseRevenueData(data, cik);
  } catch (err) {
    console.warn(`  ⚠️  Error fetching CIK ${cik}: ${err}`);
    return [];
  }
}

function parseRevenueData(data: SecRevenueFactsResponse, cik: string): SecRevenueRecord[] {
  const results: SecRevenueRecord[] = [];
  const units = data.units;

  if (!units) return results;

  // Get USD units
  const usdData = units["USD"] || units["usd"];
  if (!usdData || !Array.isArray(usdData)) return results;

  // Filter to annual (FY or 10-K) filings, deduplicate by fiscal year
  const byYear = new Map<number, SecRevenueEntry>();

  for (const entry of usdData) {
    if (entry.fp === "FY" && entry.form === "10-K") {
      const year = parseInt(entry.fy);
      const existing = byYear.get(year);
      if (!existing || entry.end > existing.end) {
        byYear.set(year, entry);
      }
    }
  }

  for (const [year, entry] of byYear) {
    results.push({
      companyId: "",
      companyName: "",
      cik,
      fiscalYear: year,
      revenue: Number((entry.val / 1_000_000).toFixed(1)), // Convert to millions
      source: `SEC EDGAR 10-K filing (CIK ${cik}, FY${year})`,
      filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K&dateb=&owner=include&count=10`,
      filingType: "10-K",
    });
  }

  return results.sort((a, b) => b.fiscalYear - a.fiscalYear);
}

async function main() {
  console.log("🔍 Fetching SEC 10-K revenue data for public companies...\n");

  const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
  const companies: Company[] = dataset.companies || [];

  const allResults: SecRevenueRecord[] = [];

  for (const company of companies) {
    const cikEntry = COMPANY_CIK_MAP[company.name];
    if (!cikEntry) continue;

    console.log(`  ${company.name} (CIK: ${cikEntry.cik})...`);

    // Rate limit: SEC requires max 10 requests/second
    await new Promise(resolve => setTimeout(resolve, 150));

    const records = await fetchRevenueForCompany(cikEntry.cik);

    for (const record of records) {
      record.companyId = company.id;
      record.companyName = company.name;
      if (cikEntry.ticker) record.ticker = cikEntry.ticker;
      allResults.push(record);
      console.log(`    FY${record.fiscalYear}: $${record.revenue}M`);
    }

    if (records.length === 0) {
      console.log(`    No 10-K revenue data found`);
    }
  }

  // Also fetch for acquirers that are public
  const acquirers: Array<{ id: string; name: string }> = dataset.acquirers || [];
  for (const acquirer of acquirers) {
    const cikEntry = COMPANY_CIK_MAP[acquirer.name];
    if (!cikEntry) continue;

    console.log(`  Acquirer: ${acquirer.name} (CIK: ${cikEntry.cik})...`);
    await new Promise(resolve => setTimeout(resolve, 150));

    const records = await fetchRevenueForCompany(cikEntry.cik);
    for (const record of records) {
      record.companyId = acquirer.id || "";
      record.companyName = acquirer.name;
      if (cikEntry.ticker) record.ticker = cikEntry.ticker;
      allResults.push(record);
      console.log(`    FY${record.fiscalYear}: $${record.revenue}M`);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "SEC EDGAR XBRL API (https://data.sec.gov/api/xbrl)",
    userAgent: SEC_USER_AGENT,
    method: "Revenue fetched from SEC 10-K filings via XBRL CompanyConcept API. Values converted from USD to millions. Only annual (FY) filings included.",
    totalRecords: allResults.length,
    companies: [...new Set(allResults.map(r => r.companyName))],
    records: allResults,
  };

  writeFileSync("src/data/computed-sec-revenue.json", JSON.stringify(output, null, 2));

  console.log(`\n✅ SEC revenue data written to src/data/computed-sec-revenue.json`);
  console.log(`   ${allResults.length} revenue records for ${output.companies.length} companies`);
}

main().catch(console.error);
