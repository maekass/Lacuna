#!/usr/bin/env npx tsx

/**
 * CMS Reimbursement Rate Fetcher
 *
 * Fetches real CPT code payment rates from the CMS Physician Fee Schedule API.
 * Replaces hardcoded reimbursement percentages with sourced data.
 *
 * API: https://data.cms.gov/provider-data/api/1/datastore/sql
 * CMS PFS Look-up Tool: https://www.cms.gov/medicare/payment/fee-schedules
 *
 * Output: src/data/computed-reimbursement-rates.json
 *
 * Usage: npx tsx scripts/fetch-cms-rates.ts
 */

import { readFileSync, writeFileSync } from "fs";

interface ComputedCmsUtilizationFile {
  sectors: Array<{
    sector: string;
    avgServicesPerCode: number | null;
  }>;
}

/** Sector-level annual services per CPT from computed CMS PUF artifact. */
function loadSectorAnnualUses(): Map<string, number> {
  const raw = JSON.parse(
    readFileSync("src/data/computed-cms-utilization.json", "utf8"),
  ) as ComputedCmsUtilizationFile;

  const map = new Map<string, number>();
  for (const sector of raw.sectors ?? []) {
    if (
      sector.avgServicesPerCode !== null &&
      sector.avgServicesPerCode !== undefined
    ) {
      map.set(sector.sector, sector.avgServicesPerCode);
    }
  }
  return map;
}

function portfolioMedianAnnualUses(sectorUses: Map<string, number>): number {
  const values = [...sectorUses.values()].sort((a, b) => a - b);
  if (values.length === 0) return 100;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.round((values[mid - 1] + values[mid]) / 2)
    : values[mid];
}

interface CptCodeRate {
  cptCode: string;
  description: string;
  rvuWork: number | null;
  rvuPractice: number | null;
  rvuMalpractice: number | null;
  paymentRate: number | null; // National average
  source: string;
  fetchedAt: string;
}

interface SectorReimbursement {
  sector: string;
  cptCodes: string[];
  avgPaymentPerCode: number | null;
  totalAnnualReimbursementEstimate: number | null;
  source: string;
  method: string;
}

// CPT codes per sector from cms-reimbursement-connector.ts
const SECTOR_CPT_CODES: Record<string, string[]> = {
  fertility: ["58321", "58322", "58970", "89250"],
  maternal_health: ["59400", "59510", "59618", "76801", "76805"],
  mental_health: ["90791", "90834", "90837", "96116", "96127"],
  gynecology: ["57420", "57421", "58100", "58300", "58558"],
  pelvic_health: ["51741", "51798", "57288", "57289"],
  menopause: ["99213", "99214", "84443", "82671"],
  contraception: ["58300", "58301", "J7300", "J7302"],
  breast_health: ["77067", "77063", "19101", "38525"],
  wearable_monitoring: ["99453", "99454", "99457", "99458"],
  digital_therapeutics: ["98960", "99421", "99422", "99423"],
};

type CmsApiRow = Record<string, string | number | null | undefined>;
const CMS_API_BASE = "https://data.cms.gov/data-api/v1/dataset";
const CMS_PFS_DATASET_ID = "78py-wnyg"; // CMS Physician Fee Schedule

async function fetchCptRate(cptCode: string): Promise<CptCodeRate | null> {
  try {
    // CMS Data API — query PFS by HCPCS/CPT code
    const url =
      `${CMS_API_BASE}/${CMS_PFS_DATASET_ID}/data?filter[HCPCS_CODE]=${cptCode}&limit=1`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `  ⚠️  CMS API returned ${response.status} for CPT ${cptCode}`,
      );
      return null;
    }

    const data = await response.json() as CmsApiRow[];
    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
      cptCode,
      description: row.HCPCS_DESCRIPTION || row.DESCRIPTION || "Unknown",
      rvuWork: parseFloat(row.RVU_WORK) || null,
      rvuPractice: parseFloat(row.RVU_PRAC) || null,
      rvuMalpractice: parseFloat(row.RVU_MAL) || null,
      paymentRate: parseFloat(row.PAYMENT_RATE) ||
        parseFloat(row.NATIONAL_PAYMENT) || null,
      source: "CMS Physician Fee Schedule API (data.cms.gov)",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`  ⚠️  Failed to fetch CPT ${cptCode}: ${err}`);
    return null;
  }
}

async function main() {
  console.log("🔍 Fetching CMS Physician Fee Schedule rates...\n");

  const sectorAnnualUses = loadSectorAnnualUses();
  const portfolioMedianUses = portfolioMedianAnnualUses(sectorAnnualUses);

  const results: SectorReimbursement[] = [];

  for (const [sector, codes] of Object.entries(SECTOR_CPT_CODES)) {
    console.log(`  ${sector} (${codes.length} CPT codes)...`);

    const rates: CptCodeRate[] = [];
    for (const code of codes) {
      const rate = await fetchCptRate(code);
      if (rate) {
        rates.push(rate);
        console.log(
          `    CPT ${code}: $${
            rate.paymentRate ?? "N/A"
          } (RVU: ${rate.rvuWork})`,
        );
      } else {
        console.log(`    CPT ${code}: Not found in CMS API`);
      }
    }

    const validRates = rates.filter((r) => r.paymentRate !== null);
    const avgPayment = validRates.length > 0
      ? validRates.reduce((sum, r) => sum + (r.paymentRate || 0), 0) /
        validRates.length
      : null;

    // Estimate annual reimbursement using sector utilization from computed CMS PUF data
    const annualUsesPerCode = sectorAnnualUses.get(sector) ??
      portfolioMedianUses;
    const totalEstimate = avgPayment !== null
      ? avgPayment * annualUsesPerCode * codes.length
      : null;

    results.push({
      sector,
      cptCodes: codes,
      avgPaymentPerCode: avgPayment !== null
        ? Number(avgPayment.toFixed(2))
        : null,
      totalAnnualReimbursementEstimate: totalEstimate !== null
        ? Number(totalEstimate.toFixed(2))
        : null,
      source: "CMS Physician Fee Schedule API (data.cms.gov)",
      method:
        `avg(paymentRate) × ${annualUsesPerCode} annual uses/code (from computed-cms-utilization.json) × ${codes.length} codes.`,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "CMS Physician Fee Schedule API (https://data.cms.gov)",
    apiEndpoint: CMS_API_BASE,
    sectors: results,
    disclaimer:
      "Payment rates are national averages from CMS PFS. Actual reimbursement varies by geography, payer, and modifier. Annual utilization volumes sourced from computed-cms-utilization.json (CMS PUF).",
  };

  writeFileSync(
    "src/data/computed-reimbursement-rates.json",
    JSON.stringify(output, null, 2),
  );

  console.log(
    "\n✅ Reimbursement rates written to src/data/computed-reimbursement-rates.json",
  );
  console.log(`   ${results.length} sectors processed`);
  console.log(
    `   ${
      results.filter((r) => r.avgPaymentPerCode !== null).length
    } sectors with sourced rates`,
  );
}

main().catch(console.error);
