/**
 * Batch-download free public API data for Lacuna verified-dataset entities.
 *
 * Usage:
 *   SEC_EDGAR_USER_AGENT="Lacuna Research mps5cy@virginia.edu" npm run download:free-apis
 *   npm run download:free-apis -- --limit 5
 *   npm run download:free-apis -- --sources clinical_trials_gov,openfda,wikidata
 *
 * Output: data/exports/free-apis/<timestamp>/
 */

import process from "node:process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import {
  ALL_FREE_API_SOURCES,
  downloadFreeApiBundles,
  type FreeApiSourceId,
} from "../src/lib/ingestion/freeApi";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");
const exportsRoot = join(__dirname, "../data/exports/free-apis");

function parseArgs(argv: string[]): {
  limit?: number;
  sources?: FreeApiSourceId[];
  outDir?: string;
} {
  const out: {
    limit?: number;
    sources?: FreeApiSourceId[];
    outDir?: string;
  } = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit" && argv[i + 1]) {
      out.limit = Number(argv[++i]);
    } else if (arg === "--sources" && argv[i + 1]) {
      const ids = argv[++i].split(",").map((s) =>
        s.trim()
      ) as FreeApiSourceId[];
      const valid = new Set(ALL_FREE_API_SOURCES);
      const bad = ids.filter((id) => !valid.has(id));
      if (bad.length > 0) {
        console.error(`Unknown source(s): ${bad.join(", ")}`);
        console.error(`Valid: ${ALL_FREE_API_SOURCES.join(", ")}`);
        process.exit(1);
      }
      out.sources = ids;
    } else if (arg === "--out" && argv[i + 1]) {
      out.outDir = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return out;
}

function printHelp(): void {
  console.log(`Lacuna free-API batch downloader

Writes JSON per entity under data/exports/free-apis/<timestamp>/.

Environment:
  SEC_EDGAR_USER_AGENT   Required if SEC sources included
  NCBI_TOOL_EMAIL        PubMed E-utilities (recommended)
  PATENTSVIEW_API_KEY    Optional — PatentsView search

Options:
  --limit N              First N unique companies+acquirers only
  --sources a,b,c        Subset of: ${ALL_FREE_API_SOURCES.join(", ")}
  --out DIR              Output directory (default: timestamped subfolder)
  --help

Example:
  SEC_EDGAR_USER_AGENT="Lacuna mps5cy@virginia.edu" \\
    NCBI_TOOL_EMAIL=mps5cy@virginia.edu \\
    npm run download:free-apis -- --limit 3
`);
}

function sanitizeFileName(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = args.sources ?? ALL_FREE_API_SOURCES;
  const needsSec = sources.some((s) =>
    s === "sec_submissions" || s === "sec_company_facts"
  );

  if (needsSec && !process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error(
      "SEC sources requested but SEC_EDGAR_USER_AGENT is not set.",
    );
    console.error(
      'Example: SEC_EDGAR_USER_AGENT="Lacuna Research mps5cy@virginia.edu" npm run download:free-apis',
    );
    process.exit(1);
  }

  const raw = readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(raw) as VerifiedDataset;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = args.outDir ?? join(exportsRoot, stamp);
  mkdirSync(outDir, { recursive: true });

  console.log(`Dataset: ${datasetPath}`);
  console.log(`Output:  ${outDir}`);
  console.log(`Sources: ${sources.join(", ")}`);
  if (args.limit) console.log(`Limit:   ${args.limit} entities`);
  console.log("");

  const { manifest, records } = await downloadFreeApiBundles(dataset, {
    datasetPath,
    limit: args.limit,
    sources,
    onProgress: (msg) => console.log(msg),
  });

  writeFileSync(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const entitiesDir = join(outDir, "entities");
  mkdirSync(entitiesDir, { recursive: true });

  let okCount = 0;
  let errCount = 0;
  for (const record of records) {
    for (const src of record.sources) {
      if (src.ok) okCount += 1;
      else errCount += 1;
    }
    const file = join(entitiesDir, `${sanitizeFileName(record.entityId)}.json`);
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }

  writeFileSync(
    join(outDir, "all-entities.json"),
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    `Done. ${records.length} entities, ${okCount} OK fetches, ${errCount} skipped/errors.`,
  );
  console.log(`Manifest: ${join(outDir, "manifest.json")}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
