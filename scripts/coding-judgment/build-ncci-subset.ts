#!/usr/bin/env tsx
/**
 * Download the current-quarter CMS Medicare NCCI practitioner PTP and MUE
 * files, pin them by SHA-256, parse them, and commit only the rows the frozen
 * eval needs.
 *
 *   npm run coding-judgment:build-ncci
 *
 * Full zips live under staging/coding-judgment/ncci/ (gitignored). Extraction
 * uses the system `unzip` binary; CI never runs this script.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  buildCoverage,
  buildPtpAbsence,
  parseMueCsv,
  parsePtpText,
} from "../../src/lib/payerOps/codingJudgment/ncci";
import { requiredRuleKeys } from "../../src/lib/payerOps/codingJudgment/retrieval";
import {
  evalSetSchema,
  type MueEdit,
  type NcciSubset,
  ncciSubsetSchema,
  type PtpEdit,
} from "../../src/lib/payerOps/codingJudgment/schemas";

const PTP_VERSION = "v323r0";
const QUARTER = "2026Q4";
const CACHE = "staging/coding-judgment/ncci";
const CASES_PATH = "data/coding-judgment/eval-cases.v1.json";
const OUT_PATH = "data/coding-judgment/ncci-practitioner-2026q4.subset.json";
const PTP_PAGE =
  "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits";
const MUE_PAGE =
  "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits";

interface SourceSpec {
  role: "ptp" | "mue";
  url: string;
  member: string;
}

const SOURCES: SourceSpec[] = [
  ...[1, 2, 3, 4].map((part) => ({
    role: "ptp" as const,
    url:
      `https://www.cms.gov/files/zip/medicare-ncci-2026q4-practitioner-ptp-edits-ccipra-${PTP_VERSION}-f${part}.zip`,
    member: `ccipra-${PTP_VERSION}-f${part}.${part <= 2 ? "TXT" : "txt"}`,
  })),
  {
    role: "mue",
    url:
      "https://www.cms.gov/files/zip/medicare-ncci-2026-q4-practitioner-services-mue-table.zip",
    member: "MCR_MUE_PractitionerServices_Eff_10-01-2026.csv",
  },
];

function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

async function download(url: string, path: string): Promise<void> {
  if (existsSync(path)) return;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Lacuna coding-judgment-check)" },
  });
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  writeFileSync(path, new Uint8Array(await response.arrayBuffer()));
}

async function main(): Promise<void> {
  mkdirSync(CACHE, { recursive: true });
  const evalSet = evalSetSchema.parse(
    JSON.parse(readFileSync(CASES_PATH, "utf8")),
  );
  const keys = requiredRuleKeys(evalSet.cases);
  const retrievedAt = new Date().toISOString();

  const ptpRows: PtpEdit[] = [];
  let mueRows: MueEdit[] = [];
  const sourceFiles: NcciSubset["sourceFiles"] = [];
  for (const source of SOURCES) {
    const zipPath = `${CACHE}/${source.url.split("/").at(-1)}`;
    await download(source.url, zipPath);
    const zip = readFileSync(zipPath);
    const member = execFileSync("unzip", ["-p", zipPath, source.member], {
      maxBuffer: 256 * 1024 * 1024,
    });
    const text = member.toString("latin1");
    const parsed = source.role === "ptp"
      ? parsePtpText(text, PTP_VERSION)
      : parseMueCsv(text, QUARTER);
    if (source.role === "ptp") {
      for (const row of parsed as PtpEdit[]) ptpRows.push(row);
    } else mueRows = parsed as MueEdit[];
    sourceFiles.push({
      role: source.role,
      url: source.url,
      zipSha256: sha256(zip),
      zipBytes: zip.byteLength,
      memberName: source.member,
      memberSha256: sha256(member),
      dataRowCount: parsed.length,
    });
    console.log(`${source.member}: ${parsed.length} rows`);
  }

  const ptpCodes = new Set<string>();
  for (const row of ptpRows) {
    ptpCodes.add(row.column1);
    ptpCodes.add(row.column2);
  }
  const mueCodes = new Set(mueRows.map((row) => row.code));

  const pairKey = (a: string, b: string) => [a, b].sort().join("|");
  const wanted = new Set(keys.pairs.map(([a, b]) => pairKey(a, b)));
  const ptpEdits = ptpRows.filter((row) =>
    wanted.has(pairKey(row.column1, row.column2))
  ).sort((a, b) => a.id.localeCompare(b.id));
  const found = new Set(
    ptpEdits.map((row) => pairKey(row.column1, row.column2)),
  );
  const ptpPairAbsences = keys.pairs.filter(([a, b]) =>
    !found.has(pairKey(a, b))
  ).map(([a, b]) => buildPtpAbsence(PTP_VERSION, a, b));
  const mueEdits = mueRows.filter((row) => keys.mueCodes.includes(row.code))
    .sort((a, b) => a.id.localeCompare(b.id));

  const subset: NcciSubset = {
    schemaVersion: "1.0.0",
    program: "Medicare NCCI — practitioner",
    ptpVersion: PTP_VERSION,
    quarter: QUARTER,
    effectiveFrom: "2026-10-01",
    effectiveThrough: "2026-12-31",
    retrievedAt,
    sourcePages: [PTP_PAGE, MUE_PAGE],
    sourceFiles,
    licenseNote:
      "CMS NCCI files include CPT codes (copyright American Medical Association). Only code numbers, dates, indicators and CMS rationale labels are committed here; no CPT descriptors. See docs/REIMBURSEMENT_CPT_LICENSING.md.",
    ptpEdits,
    mueEdits,
    coverage: buildCoverage(QUARTER, keys.codes, ptpCodes, mueCodes),
    ptpPairAbsences,
  };
  const parsed = ncciSubsetSchema.parse(subset);
  writeFileSync(OUT_PATH, JSON.stringify(parsed, null, 2) + "\n");
  console.log(
    `Pinned ${ptpEdits.length} PTP rows, ${mueEdits.length} MUE rows, ${parsed.coverage.length} coverage records, ${ptpPairAbsences.length} absences`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
