#!/usr/bin/env npx tsx

/**
 * Crunchbase Text Block Ingestion Script
 *
 * Parses the copy-paste text format from Crunchbase Pro search results:
 *
 *   CompanyName Logo
 *   CompanyName
 *   Description text...
 *   Industry1, Industry2, ...
 *   City, State, Country
 *   Tagline text
 *   RankNumber
 *
 * Input:  data/crunchbase-exports/crunchbase-paste.txt
 * Output: Updates src/data/dataset.verified.json
 *         Writes src/data/computed-crunchbase-enrichment.json
 *
 * Usage: npx tsx scripts/ingest-crunchbase-text.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import process from "node:process";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const EXPORT_DIR = resolve(ROOT, "data", "crunchbase-exports");
const SRC_DATA_DIR = resolve(ROOT, "src", "data");
const INPUT_FILE = resolve(EXPORT_DIR, "crunchbase-paste.txt");

interface CrunchbaseEntry {
  name: string;
  description: string;
  industries: string[];
  headquarters: string;
  tagline: string;
  rank: number | null;
}

interface Company {
  id: string;
  name: string;
  sector: string;
  description?: string;
  sources?: string[];
  crunchbaseIndustries?: string[];
  headquarters?: string;
  tagline?: string;
  crunchbaseRank?: number;
}

interface CrunchbaseTextAuditEntry {
  name?: string;
  matched: boolean;
  matchMethod: string;
  crunchbaseName?: string;
  companyId?: string;
  companyName?: string;
  fieldsUpdated?: string[];
}

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

/**
 * Parse the Crunchbase copy-paste text block format.
 *
 * Each entry looks like:
 *   CompanyName Logo        <- marker line (skip)
 *   CompanyName             <- company name (same as before "Logo")
 *   Description paragraph   <- one or more lines
 *   Industry1, Industry2    <- comma-separated, contains known industry words
 *   City, State, Country    <- location line
 *   Tagline                 <- short tagline
 *   12345                   <- rank (just digits)
 *
 * Entries are separated by a blank line before the next "X Logo" line.
 */
function parseCrunchbaseText(text: string): CrunchbaseEntry[] {
  const lines = text.split("\n").map((l) => l.trim());
  const entries: CrunchbaseEntry[] = [];

  // Split into blocks by "X Logo" lines
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.endsWith(" Logo") && line.length < 80) {
      if (currentBlock.length > 0) blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  const INDUSTRY_KEYWORDS = [
    "Health Care",
    "Biotechnology",
    "Medical",
    "Pharmaceutical",
    "Wellness",
    "Fertility",
    "Women's",
    "Artificial Intelligence",
    "Software",
    "SaaS",
    "Diagnostics",
    "Medical Device",
    "Telehealth",
    "mHealth",
    "Genetics",
    "Nutrition",
    "Fitness",
    "E-Commerce",
    "Retail",
    "Life Science",
    "Financial Services",
    "Venture Capital",
    "Clinical Trials",
    "Oncology",
    "Biopharma",
    "Analytics",
    "Hardware",
    "Internet of Things",
    "Wearables",
    "Consumer Electronics",
    "Consumer Goods",
    "Family",
    "Lifestyle",
    "Personal Health",
    "Information Technology",
    "Manufacturing",
    "Electronic Health Record",
    "Enterprise Software",
    "Property Management",
    "PropTech",
    "Real Estate",
    "Machine Learning",
    "Generative AI",
    "Business Intelligence",
    "Mobile",
    "Apps",
    "Internet",
    "Social Network",
    "Online Portals",
    "Information Services",
    "Hospital",
    "Dietary Supplements",
    "Beauty",
    "Technical Support",
    "Therapeutics",
    "Health Diagnostics",
  ];

  for (const block of blocks) {
    const nonEmpty = block.filter((l) => l.length > 0);
    if (nonEmpty.length < 3) continue;

    // First line: "CompanyName Logo" — extract name
    const logoLine = nonEmpty[0];
    const name = logoLine.replace(/ Logo$/, "").trim();

    // Second line should be the company name again (skip it)
    const idx = 2;

    // Find industries line — it contains multiple comma-separated industry keywords
    let industries: string[] = [];
    let industriesIdx = -1;
    for (let i = idx; i < nonEmpty.length; i++) {
      const parts = nonEmpty[i].split(",").map((p) => p.trim());
      const matchCount = parts.filter((p) =>
        INDUSTRY_KEYWORDS.some((k) =>
          p.toLowerCase().includes(k.toLowerCase())
        )
      ).length;
      if (
        matchCount >= 2 ||
        (parts.length >= 2 && matchCount >= 1 && parts.length <= 8)
      ) {
        industries = parts;
        industriesIdx = i;
        break;
      }
    }

    // Description = lines between name and industries
    const descLines: string[] = [];
    const endDesc = industriesIdx > 0 ? industriesIdx : nonEmpty.length - 3;
    for (let i = idx; i < endDesc; i++) {
      if (nonEmpty[i]) descLines.push(nonEmpty[i]);
    }
    const description = descLines.join(" ").trim();

    // Headquarters = line after industries (location pattern: City, State/Province, Country)
    let headquarters = "";
    let tagline = "";
    let rank: number | null = null;

    if (industriesIdx >= 0 && industriesIdx + 1 < nonEmpty.length) {
      headquarters = nonEmpty[industriesIdx + 1] || "";
      tagline = nonEmpty[industriesIdx + 2] || "";
      const rankStr = nonEmpty[industriesIdx + 3] || "";
      const rankNum = parseInt(rankStr.replace(/,/g, ""));
      if (!isNaN(rankNum) && rankStr.match(/^[\d,]+$/)) rank = rankNum;
    }

    if (name) {
      entries.push({
        name,
        description,
        industries,
        headquarters,
        tagline,
        rank,
      });
    }
  }

  return entries;
}

function main() {
  mkdirSync(EXPORT_DIR, { recursive: true });

  let text: string;
  try {
    text = readFileSync(INPUT_FILE, "utf-8");
  } catch {
    console.error(`❌ File not found: ${INPUT_FILE}`);
    console.error("   Save the Crunchbase paste to that file and re-run.");
    process.exit(1);
  }
  const entries = parseCrunchbaseText(text);
  console.log(`📋 Parsed ${entries.length} Crunchbase entries from text\n`);

  const dataset = JSON.parse(
    readFileSync(resolve(SRC_DATA_DIR, "dataset.verified.json"), "utf-8"),
  );
  const companies: Company[] = dataset.companies || [];

  const auditTrail: CrunchbaseTextAuditEntry[] = [];
  let enriched = 0;
  const unmatched: string[] = [];

  for (const entry of entries) {
    // Try to match to a dataset company
    let matched: Company | undefined;
    let matchMethod = "none";

    const exactNorm = normalizeName(entry.name);
    matched = companies.find((c) => normalizeName(c.name) === exactNorm);
    if (matched) matchMethod = "exact-normalized";

    if (!matched) {
      matched = companies.find((c) => fuzzyMatch(entry.name, c.name));
      if (matched) matchMethod = "fuzzy";
    }

    if (!matched) {
      unmatched.push(entry.name);
      auditTrail.push({
        name: entry.name,
        matched: false,
        matchMethod: "no-match",
      });
      continue;
    }

    const updated: string[] = [];
    const source = `Crunchbase Pro (crunchbase.com/organization/${
      normalizeName(entry.name)
    }, accessed ${new Date().toISOString().split("T")[0]})`;

    if (entry.description && !matched.description) {
      matched.description = entry.description;
      updated.push("description");
    }

    if (entry.industries.length > 0) {
      matched.crunchbaseIndustries = entry.industries;
      updated.push("crunchbaseIndustries");
    }

    if (entry.headquarters) {
      matched.headquarters = entry.headquarters;
      updated.push("headquarters");
    }

    if (entry.tagline) {
      matched.tagline = entry.tagline;
      updated.push("tagline");
    }

    if (entry.rank !== null) {
      matched.crunchbaseRank = entry.rank;
      updated.push("crunchbaseRank");
    }

    // Add Crunchbase source citation
    const existingSources: string[] = matched.sources || [];
    if (!existingSources.some((s) => s.toLowerCase().includes("crunchbase"))) {
      matched.sources = [...existingSources, source];
      updated.push("sources");
    }

    if (updated.length > 0) {
      enriched++;
      console.log(
        `  ✅ ${matched.name} (${matched.id}): +${updated.join(", ")}`,
      );
    }

    auditTrail.push({
      crunchbaseName: entry.name,
      companyId: matched.id,
      companyName: matched.name,
      matched: true,
      matchMethod,
      fieldsUpdated: updated,
    });
  }

  writeFileSync(
    resolve(SRC_DATA_DIR, "dataset.verified.json"),
    JSON.stringify(dataset, null, 2),
  );

  const auditOutput = {
    generatedAt: new Date().toISOString(),
    source: INPUT_FILE,
    entriesParsed: entries.length,
    companiesEnriched: enriched,
    unmatched: unmatched.length,
    unmatchedNames: unmatched,
    auditTrail,
  };
  writeFileSync(
    resolve(SRC_DATA_DIR, "computed-crunchbase-enrichment.json"),
    JSON.stringify(auditOutput, null, 2),
  );

  console.log(
    `\n✅ Enriched ${enriched}/${entries.length} companies from Crunchbase paste`,
  );
  if (unmatched.length > 0) {
    console.log(
      `\n⚠️  ${unmatched.length} entries not matched to dataset companies:`,
    );
    unmatched.forEach((n) => console.log(`   - ${n}`));
    console.log(
      "\n   These may be companies not in our dataset (expected for broad Crunchbase searches)",
    );
  }
  console.log("\n   Updated src/data/dataset.verified.json");
  console.log("   Audit: src/data/computed-crunchbase-enrichment.json");
  console.log("\n   Next: npx tsx scripts/compute-data-quality.ts");
}

main();
