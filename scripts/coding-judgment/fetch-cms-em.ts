#!/usr/bin/env tsx
/**
 * Pull CMS "Medicare Physician & Other Practitioners — by Provider and
 * Service" rows for one specialty and code family (from a peer-screen
 * config; default OB/GYN, 99211–99215) through the public data-api.
 *
 *   npm run coding-judgment:fetch-cms [-- --config <path>]
 *
 * Raw rows contain provider names and NPIs, so they are written only under
 * staging/coding-judgment/ (gitignored). Only the pull manifest (query URLs,
 * counts, hashes) is carried into committed artifacts by
 * build-em-benchmark.ts.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { stagingPathsFor } from "../../src/lib/payerOps/codingJudgment/config";
import { loadPeerScreenConfig } from "../../src/lib/payerOps/codingJudgment/loadConfig";

const configArg = process.argv.indexOf("--config");
const { config } = loadPeerScreenConfig(
  configArg >= 0 ? process.argv[configArg + 1] : undefined,
);
const DATASET_ID = config.cms.datasetId;
const API_BASE = `https://data.cms.gov/data-api/v1/dataset/${DATASET_ID}/data`;
const SPECIALTY = config.specialty.cmsProviderType;
const CODES = config.codeFamily.codes;
const PAGE_SIZE = 5000;
const PATHS = stagingPathsFor(config);

/** Only the fields the analysis needs are kept from each row. */
const KEEP = [
  "Rndrng_NPI",
  "Rndrng_Prvdr_Type",
  "Rndrng_Prvdr_Ent_Cd",
  "HCPCS_Cd",
  "Place_Of_Srvc",
  "Tot_Benes",
  "Tot_Srvcs",
] as const;

type KeptRow = Record<(typeof KEEP)[number], string>;

function queryUrl(path: string, code: string, offset?: number): string {
  const url = new URL(path);
  url.searchParams.set("filter[Rndrng_Prvdr_Type]", SPECIALTY);
  url.searchParams.set("filter[HCPCS_Cd]", code);
  if (offset !== undefined) {
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
  }
  return url.toString();
}

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    if (response.ok) return await response.json();
    if (response.status < 500 && response.status !== 429) {
      throw new Error(`GET ${url} → ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  throw new Error(`GET ${url} failed after retries`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function main(): Promise<void> {
  const retrievedAt = new Date().toISOString();
  const queryUrls: string[] = [];
  const rowCountsByCode: Record<string, number> = {};
  const apiFoundRowsByCode: Record<string, number> = {};
  const rows: KeptRow[] = [];

  for (const code of CODES) {
    const statsUrl = queryUrl(`${API_BASE}/stats`, code);
    const stats = await getJson(statsUrl);
    if (!isRecord(stats) || typeof stats.found_rows !== "number") {
      throw new Error(`Unexpected stats payload for ${code}`);
    }
    apiFoundRowsByCode[code] = stats.found_rows;
    queryUrls.push(statsUrl);

    let offset = 0;
    let count = 0;
    for (;;) {
      const url = queryUrl(API_BASE, code, offset);
      queryUrls.push(url);
      const page = await getJson(url);
      if (!Array.isArray(page)) throw new Error(`Non-array page: ${url}`);
      for (const item of page) {
        if (!isRecord(item)) throw new Error(`Non-object row: ${url}`);
        const kept = {} as KeptRow;
        for (const key of KEEP) {
          const value = item[key];
          if (typeof value !== "string") {
            throw new Error(`Row missing ${key}: ${url}`);
          }
          kept[key] = value;
        }
        if (kept.HCPCS_Cd !== code || kept.Rndrng_Prvdr_Type !== SPECIALTY) {
          throw new Error(`Filter mismatch in ${url}`);
        }
        rows.push(kept);
      }
      count += page.length;
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    rowCountsByCode[code] = count;
    if (count !== apiFoundRowsByCode[code]) {
      throw new Error(
        `${code}: paged ${count} rows but stats reported ${
          apiFoundRowsByCode[code]
        }`,
      );
    }
    console.log(`${code}: ${count} rows`);
  }

  rows.sort((a, b) =>
    a.Rndrng_NPI.localeCompare(b.Rndrng_NPI) ||
    a.HCPCS_Cd.localeCompare(b.HCPCS_Cd) ||
    a.Place_Of_Srvc.localeCompare(b.Place_Of_Srvc)
  );
  const canonical = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  const sha256 = createHash("sha256").update(canonical).digest("hex");

  mkdirSync(PATHS.dir, { recursive: true });
  writeFileSync(PATHS.rows, canonical);
  writeFileSync(
    PATHS.pull,
    JSON.stringify(
      {
        configId: config.id,
        datasetId: DATASET_ID,
        retrievedAt,
        queryUrls,
        rowCountsByCode,
        apiFoundRowsByCode,
        totalRows: rows.length,
        canonicalRowsSha256: sha256,
        keptFields: KEEP,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Wrote ${rows.length} rows; sha256 ${sha256}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
