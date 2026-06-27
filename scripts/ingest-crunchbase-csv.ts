#!/usr/bin/env npx tsx

/**
 * Crunchbase CSV Ingestion Script
 *
 * Reads Crunchbase Pro CSV exports from data/crunchbase-exports/
 * and merges the data into src/data/dataset.verified.json.
 *
 * Supports two CSV formats:
 *   1. Individual company exports: data/crunchbase-exports/{companyId}.csv
 *   2. Batch sector exports: data/crunchbase-exports/crunchbase-{sector}.csv
 *   3. Single large export: data/crunchbase-exports/crunchbase-all.csv
 *
 * The script matches companies by name (fuzzy match) and enriches:
 *   - totalFunding (from "Total Funding Amount")
 *   - lastKnownValuation (from "Last Known Valuation")
 *   - foundedDate (from "Founded Date")
 *   - employees (from "Number of Employees")
 *   - operatingStatus (from "Operating Status")
 *   - lastFundingType (from "Last Funding Type")
 *   - lastFundingDate (from "Last Funding Date")
 *   - fundingRounds (from "Number of Funding Rounds")
 *   - industries (from "Industries")
 *   - headquarters (from "Headquarters Location")
 *   - sources (adds Crunchbase citation)
 *
 * Output: Updates src/data/dataset.verified.json
 *         Writes audit trail to src/data/computed-crunchbase-enrichment.json
 *
 * Usage: npx tsx scripts/ingest-crunchbase-csv.ts
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const EXPORT_DIR = resolve(ROOT, "data", "crunchbase-exports");
const SRC_DATA_DIR = resolve(ROOT, "src", "data");

interface Company {
  id: string;
  name: string;
  sector: string;
  totalFunding?: number;
  lastKnownValuation?: number;
  valuationSource?: string;
  fundingSource?: string;
  foundedDate?: string;
  employees?: string;
  operatingStatus?: string;
  lastFundingType?: string;
  lastFundingDate?: string;
  fundingRounds?: number;
  industries?: string[];
  headquarters?: string;
  sources?: string[];
}

interface EnrichmentRecord {
  companyId: string;
  companyName: string;
  matched: boolean;
  matchMethod: string;
  fieldsUpdated: string[];
  source: string;
}

// Parse Crunchbase CSV (handles quoted fields with commas)
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

// Parse monetary values from Crunchbase (e.g., "$1,234,567", "$1.2M", "$45B")
function parseMoney(value: string): number | null {
  if (!value || value === "—" || value === "N/A") return null;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/USD/gi, "");

  // Handle M/B suffixes
  if (cleaned.match(/^[0-9.]+[MB]$/i)) {
    const num = parseFloat(cleaned);
    const suffix = cleaned.slice(-1).toUpperCase();
    return suffix === "B" ? num * 1000 : num; // Convert to millions
  }

  // Handle K suffix
  if (cleaned.match(/^[0-9.]+K$/i)) {
    return parseFloat(cleaned) / 1000;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num / 1_000_000; // Convert to millions
}

// Parse date from Crunchbase (various formats)
function parseDate(value: string): string | null {
  if (!value || value === "—" || value === "N/A") return null;
  // Try ISO format
  const iso = new Date(value);
  if (!isNaN(iso.getTime())) return iso.toISOString().split("T")[0];
  return value; // Keep original if unparseable
}

// Fuzzy match company name
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/inc|llc|ltd|corp|corporation|company|co$/g, "")
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Levenshtein distance for close matches
  const dist = levenshtein(na, nb);
  return dist <= 2 && Math.min(na.length, nb.length) >= 4;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function main() {
  mkdirSync(EXPORT_DIR, { recursive: true });

  const files = readdirSync(EXPORT_DIR).filter((f) => f.endsWith(".csv"));
  if (files.length === 0) {
    console.error(`❌ No CSV files found in ${EXPORT_DIR}`);
    console.error(
      "   Export CSVs from Crunchbase Pro first, then re-run this script",
    );
    return;
  }

  console.log(`📁 Found ${files.length} CSV files in ${EXPORT_DIR}\n`);

  const dataset = JSON.parse(
    readFileSync(resolve(SRC_DATA_DIR, "dataset.verified.json"), "utf-8"),
  );
  const companies: Company[] = dataset.companies || [];

  // Build lookup map
  const companyByName = new Map<string, Company>();
  for (const c of companies) {
    companyByName.set(normalizeName(c.name), c);
  }

  const auditTrail: EnrichmentRecord[] = [];
  let totalEnriched = 0;

  // Process each CSV file
  for (const file of files) {
    const filePath = resolve(EXPORT_DIR, file);
    console.log(`  📄 Processing ${file}...`);

    const content = readFileSync(filePath, "utf-8");
    const rows = parseCsv(content);

    if (rows.length === 0) {
      console.log("    ⚠️  No data rows found");
      continue;
    }

    console.log(
      `    ${rows.length} rows, columns: ${Object.keys(rows[0]).join(", ")}`,
    );

    for (const row of rows) {
      // Find the company name column (Crunchbase uses various header names)
      const nameKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("organization name")
      ) ||
        Object.keys(row).find((k) =>
          k.toLowerCase().includes("company name")
        ) ||
        Object.keys(row).find((k) =>
          k.toLowerCase() === "name"
        );

      if (!nameKey) continue;

      const csvName = row[nameKey];
      if (!csvName) continue;

      // Try to match to a company in our dataset
      let matched: Company | undefined;
      let matchMethod = "none";

      // Try exact normalized match
      const normalized = normalizeName(csvName);
      matched = companyByName.get(normalized);
      if (matched) matchMethod = "exact-normalized";

      // Try fuzzy match
      if (!matched) {
        for (const [key, company] of companyByName) {
          if (fuzzyMatch(csvName, company.name)) {
            matched = company;
            matchMethod = "fuzzy";
            break;
          }
        }
      }

      if (!matched) {
        // Try matching by company ID from filename
        const fileId = file.replace(/\.csv$/, "").replace(/^c/, "");
        const byId = companies.find((c) => c.id === `c${fileId}`);
        if (byId) {
          matched = byId;
          matchMethod = "filename-id";
        }
      }

      if (!matched) {
        auditTrail.push({
          companyId: "",
          companyName: csvName,
          matched: false,
          matchMethod: "no-match",
          fieldsUpdated: [],
          source: file,
        });
        continue;
      }

      // Enrich the company
      const fieldsUpdated: string[] = [];
      const crunchbaseSource = `Crunchbase Pro export (${file}, accessed ${
        new Date().toISOString().split("T")[0]
      })`;

      // Total Funding
      const fundingKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("total funding")
      );
      if (fundingKey) {
        const funding = parseMoney(row[fundingKey]);
        if (funding !== null) {
          matched.totalFunding = funding;
          matched.fundingSource = crunchbaseSource;
          fieldsUpdated.push("totalFunding");
        }
      }

      // Last Known Valuation
      const valuationKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("valuation")
      );
      if (valuationKey) {
        const valuation = parseMoney(row[valuationKey]);
        if (valuation !== null) {
          matched.lastKnownValuation = valuation;
          matched.valuationSource = crunchbaseSource;
          fieldsUpdated.push("lastKnownValuation");
        }
      }

      // Founded Date
      const foundedKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("founded")
      );
      if (foundedKey) {
        const founded = parseDate(row[foundedKey]);
        if (founded) {
          matched.foundedDate = founded;
          fieldsUpdated.push("foundedDate");
        }
      }

      // Employees
      const employeeKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("employee")
      );
      if (employeeKey && row[employeeKey]) {
        matched.employees = row[employeeKey];
        fieldsUpdated.push("employees");
      }

      // Operating Status
      const statusKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("operating status")
      );
      if (statusKey && row[statusKey]) {
        matched.operatingStatus = row[statusKey];
        fieldsUpdated.push("operatingStatus");
      }

      // Last Funding Type
      const lastFundingTypeKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("last funding type")
      );
      if (lastFundingTypeKey && row[lastFundingTypeKey]) {
        matched.lastFundingType = row[lastFundingTypeKey];
        fieldsUpdated.push("lastFundingType");
      }

      // Last Funding Date
      const lastFundingDateKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("last funding date")
      );
      if (lastFundingDateKey) {
        const date = parseDate(row[lastFundingDateKey]);
        if (date) {
          matched.lastFundingDate = date;
          fieldsUpdated.push("lastFundingDate");
        }
      }

      // Number of Funding Rounds
      const roundsKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("number of funding")
      );
      if (roundsKey) {
        const rounds = parseInt(row[roundsKey]);
        if (!isNaN(rounds)) {
          matched.fundingRounds = rounds;
          fieldsUpdated.push("fundingRounds");
        }
      }

      // Industries
      const industryKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("industries")
      );
      if (industryKey && row[industryKey]) {
        matched.industries = row[industryKey].split(",").map((s) => s.trim());
        fieldsUpdated.push("industries");
      }

      // Headquarters
      const hqKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("headquarters")
      );
      if (hqKey && row[hqKey]) {
        matched.headquarters = row[hqKey];
        fieldsUpdated.push("headquarters");
      }

      // Add Crunchbase as a source
      const existingSources = matched.sources || [];
      if (!existingSources.some((s) => s.includes("Crunchbase"))) {
        matched.sources = [
          ...existingSources,
          `Crunchbase Pro - crunchbase.com/organization/${
            matched.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
              /^-|-$/g,
              "",
            )
          }`,
        ];
        fieldsUpdated.push("sources");
      }

      if (fieldsUpdated.length > 0) {
        totalEnriched++;
        console.log(
          `    ✅ ${matched.name} (${matched.id}): ${fieldsUpdated.join(", ")}`,
        );
      }

      auditTrail.push({
        companyId: matched.id,
        companyName: matched.name,
        matched: true,
        matchMethod,
        fieldsUpdated,
        source: file,
      });
    }
  }

  // Write updated dataset
  writeFileSync(
    resolve(SRC_DATA_DIR, "dataset.verified.json"),
    JSON.stringify(dataset, null, 2),
  );

  // Write audit trail
  const auditOutput = {
    generatedAt: new Date().toISOString(),
    source: "Crunchbase Pro CSV exports (data/crunchbase-exports/)",
    filesProcessed: files.length,
    companiesEnriched: totalEnriched,
    totalRows: auditTrail.length,
    matched: auditTrail.filter((a) => a.matched).length,
    unmatched: auditTrail.filter((a) => !a.matched).length,
    auditTrail,
  };
  writeFileSync(
    resolve(SRC_DATA_DIR, "computed-crunchbase-enrichment.json"),
    JSON.stringify(auditOutput, null, 2),
  );

  console.log(`\n✅ Enriched ${totalEnriched} companies from Crunchbase CSVs`);
  console.log("   Updated src/data/dataset.verified.json");
  console.log("   Audit trail: src/data/computed-crunchbase-enrichment.json");

  if (auditTrail.filter((a) => !a.matched).length > 0) {
    console.log(
      `\n⚠️  ${
        auditTrail.filter((a) => !a.matched).length
      } rows could not be matched to a company:`,
    );
    auditTrail
      .filter((a) => !a.matched)
      .forEach((a) => console.log(`   - ${a.companyName} (from ${a.source})`));
  }
}

main();
