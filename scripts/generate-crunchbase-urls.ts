#!/usr/bin/env npx tsx

/**
 * Crunchbase Search URL Generator
 *
 * Generates Crunchbase Pro search URLs for the 56 D-grade companies,
 * organized into batches suitable for CSV export (max 1,000 rows per export).
 *
 * Instructions for Crunchbase Pro users:
 *   1. Open each URL in your browser
 *   2. Review the search results
 *   3. Click "Export" → CSV
 *   4. Save the CSV to: data/crunchbase-exports/
 *   5. Name each file: crunchbase-batch-{N}.csv
 *
 * Then run: npx tsx scripts/ingest-crunchbase-csv.ts
 *
 * Output: data/crunchbase-search-urls.md (human-readable guide)
 *         data/crunchbase-search-urls.json (machine-readable)
 *
 * Usage: npx tsx scripts/generate-crunchbase-urls.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const EXPORT_DIR = resolve(ROOT, "data", "crunchbase-exports");
const DATA_DIR = resolve(ROOT, "data");
const SRC_DATA_DIR = resolve(ROOT, "src", "data");

interface Company {
  id: string;
  name: string;
  sector: string;
  sources?: string[];
  [key: string]: any;
}

function main() {
  mkdirSync(EXPORT_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const dataset = JSON.parse(
    require("fs").readFileSync(resolve(SRC_DATA_DIR, "dataset.verified.json"), "utf-8")
  );
  const companies: Company[] = dataset.companies || [];

  // Get D-grade companies from the data quality scores
  const scores = JSON.parse(
    require("fs").readFileSync(resolve(SRC_DATA_DIR, "computed-data-quality-scores.json"), "utf-8")
  );
  const dGradeIds = new Set(
    scores.companies
      .filter((c: any) => c.grade === "D")
      .map((c: any) => c.id)
  );

  const dCompanies = companies.filter((c) => dGradeIds.has(c.id));

  console.log(`📊 Found ${dCompanies.length} D-grade companies to enrich\n`);

  // Generate individual company profile URLs
  const companyUrls = dCompanies.map((c) => {
    // Crunchbase search URL for company name
    const searchUrl = `https://www.crunchbase.com/textsearch?q=${encodeURIComponent(
      c.name
    )}&entities=organizations`;

    // Direct organization URL (best guess slug)
    const slug = c.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const profileUrl = `https://www.crunchbase.com/organization/${slug}`;

    return {
      companyId: c.id,
      companyName: c.name,
      sector: c.sector,
      searchUrl,
      profileUrl,
      crunchbaseSlug: slug,
    };
  });

  // Generate batch search URLs (group by sector for easier export)
  const bySector = new Map<string, typeof companyUrls>();
  for (const entry of companyUrls) {
    if (!bySector.has(entry.sector)) bySector.set(entry.sector, []);
    bySector.get(entry.sector)!.push(entry);
  }

  // Also create a single "all companies" search URL
  // Crunchbase Pro advanced search: Organizations in women's health
  const allCompaniesSearchUrl =
    "https://www.crunchbase.com/discover/organization_collections/" +
    "75daa9a3-3a6e-4f5e-8e6a-2e67595a3e0b"; // Women's Health collection (if exists)
  // Fallback: advanced search URL
  const advancedSearchUrl =
    "https://www.crunchbase.com/discover/principal.investors?q=" +
    encodeURIComponent(
      '["women\'s health","maternal health","fertility","pelvic health","menopause"]'
    );

  // Write machine-readable JSON
  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    totalCompanies: companyUrls.length,
    instructions:
      "Open each searchUrl in Crunchbase Pro, find the correct company, export as CSV to data/crunchbase-exports/",
    companies: companyUrls,
    sectorBatches: Array.from(bySector.entries()).map(([sector, entries]) => ({
      sector,
      count: entries.length,
      companies: entries.map((e) => ({
        id: e.companyId,
        name: e.companyName,
        profileUrl: e.profileUrl,
      })),
    })),
  };
  writeFileSync(
    resolve(DATA_DIR, "crunchbase-search-urls.json"),
    JSON.stringify(jsonOutput, null, 2)
  );

  // Write human-readable markdown guide
  const md = `# Crunchbase Pro Export Guide

Generated: ${new Date().toISOString()}

## Instructions

1. **For each company below**, click the search URL to find them on Crunchbase
2. **Open the organization profile** and verify it's the right company
3. **Export the data**: Click "Export" → CSV format
4. **Save to**: \`data/crunchbase-exports/{company-id}.csv\`
   - e.g., \`data/crunchbase-exports/c90.csv\` for Apollo Neuroscience
5. **Include these fields** in your export (Crunchbase Pro lets you select columns):
   - Organization Name
   - Headquarters Location
   - Industries
   - Last Funding Type
   - Last Funding Date
   - Total Funding Amount
   - Number of Employees
   - Operating Status
   - Founded Date
   - Acquisition Status
   - Last Known Valuation
   - Number of Funding Rounds
6. **When all 56 are done**, run: \`npx tsx scripts/ingest-crunchbase-csv.ts\`

## Quick Export Tips

- You can search multiple companies at once using Crunchbase's advanced search
- Filter by Industry: "Women's Health", "Fertility", "Health Care"
- Export up to 1,000 rows at once
- Save time: export all companies in a sector as a single CSV, name it \`crunchbase-{sector}.csv\`

---

## All ${companyUrls.length} D-Grade Companies

| # | ID | Company | Sector | Crunchbase Search |
|---|-----|---------|--------|-------------------|
${companyUrls
  .map(
    (c, i) =>
      `| ${i + 1} | ${c.companyId} | ${c.companyName} | ${c.sector} | [Search](${c.searchUrl}) |`
  )
  .join("\n")}

---

## By Sector (for batch export)

${Array.from(bySector.entries())
  .map(([sector, entries]) => {
    return `### ${sector} (${entries.length} companies)

${entries
  .map(
    (e) =>
      `- **${e.companyName}** (${e.companyId}): [Search](${e.searchUrl}) | [Profile](${e.profileUrl})`
  )
  .join("\n")}`;
  })
  .join("\n\n")}

---

## CSV Export Format

Save each CSV with these columns (Crunchbase Pro default export):

\`\`\`
Organization Name, Headquarters Location, Industries, Last Funding Type,
Last Funding Date, Total Funding Amount, Number of Employees, Operating Status,
Founded Date, Acquisition Status, Last Known Valuation, Number of Funding Rounds
\`\`\`

Save files to: \`data/crunchbase-exports/\`
`;

  writeFileSync(resolve(DATA_DIR, "crunchbase-search-urls.md"), md);

  console.log(`✅ Generated Crunchbase search URLs for ${companyUrls.length} companies`);
  console.log("   📄 data/crunchbase-search-urls.md (human-readable guide)");
  console.log("   📄 data/crunchbase-search-urls.json (machine-readable)");
  console.log("\n   Next steps:");
  console.log("   1. Open data/crunchbase-search-urls.md");
  console.log("   2. Click each search URL in Crunchbase Pro");
  console.log("   3. Export CSVs to data/crunchbase-exports/");
  console.log("   4. Run: npx tsx scripts/ingest-crunchbase-csv.ts");
}

main();
