import process from "node:process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import {
  classifyEvidence,
  EVIDENCE_CLASSES,
  type EvidenceClass,
} from "../src/lib/evidence";

// One-shot backfill: write classifyEvidence() output into every company's
// `evidenceClass` field, in place, preserving the file's existing formatting
// (a single added line per company — no whole-file reserialization).
const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");

function main(): void {
  const raw = readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(raw) as VerifiedDataset;

  const counts: Record<EvidenceClass, number> = {
    clinical_therapeutic: 0,
    diagnostic_genomic: 0,
    fertility_science: 0,
    care_delivery: 0,
    consumer_wellness: 0,
  };

  let text = raw;
  for (const c of dataset.companies) {
    const cls = classifyEvidence(c);
    counts[cls] += 1;

    // Match the company's id line, capturing its exact indentation.
    const idLine = new RegExp(
      `(^([ \\t]*)"id": ${JSON.stringify(c.id)},\\n)`,
      "m",
    );
    const matches = text.match(
      new RegExp(`"id": ${JSON.stringify(c.id)},`, "g"),
    );
    if (!matches || matches.length !== 1) {
      throw new Error(
        `Expected exactly one "id": "${c.id}" line, found ${
          matches?.length ?? 0
        }`,
      );
    }
    text = text.replace(
      idLine,
      (_m, line: string, indent: string) =>
        `${line}${indent}"evidenceClass": ${JSON.stringify(cls)},\n`,
    );
  }

  writeFileSync(datasetPath, text, "utf8");

  console.log(
    "Applied evidenceClass to",
    dataset.companies.length,
    "companies",
  );
  console.log("");
  console.log("--- Companies per evidenceClass ---");
  for (const cls of EVIDENCE_CLASSES) {
    console.log(`  ${cls.padEnd(20)} ${counts[cls]}`);
  }
  const total = EVIDENCE_CLASSES.reduce((s, k) => s + counts[k], 0);
  console.log(`  ${"TOTAL".padEnd(20)} ${total}`);
}

main();
