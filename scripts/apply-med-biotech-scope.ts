/**
 * Prune dataset.verified.json to medicine & biotech scope (no consumer health / wearables).
 * Run: npx tsx scripts/apply-med-biotech-scope.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import { applyMedBiotechScope } from "../src/lib/data/medBiotechFilters";
import verifiedJson from "../src/data/dataset.verified.json";

const dataset = verifiedJson as VerifiedDataset;
const scoped = applyMedBiotechScope(dataset);

scoped.provenance = {
  ...dataset.provenance,
  lastUpdated: "2026-07-06",
  datasetVersion: "v8",
  notes: [
    ...dataset.provenance.notes.filter(
      (n) => !n.includes("Livongo Health (c23)") && !n.includes("Apostrophe"),
    ),
    "2026-07-06: Scoped dataset to medicine & biotech — removed consumer health, wearables, and consumer digital apps (51 companies, 8 deals). Fund portfolio overlay retains med/biotech holdings only.",
  ],
  purpose:
    "Educational demonstration dataset focused on women's health medicine, biotech, diagnostics, and medtech M&A. Not for commercial investment decisions.",
};

const outPath = resolve("src/data/dataset.verified.json");
writeFileSync(outPath, `${JSON.stringify(scoped, null, 2)}\n`);

console.log(
  `Scoped dataset: ${scoped.companies.length} companies, ${scoped.acquisitions.length} acquisitions`,
);
console.log(
  `Removed: ${dataset.companies.length - scoped.companies.length} companies, ${dataset.acquisitions.length - scoped.acquisitions.length} deals`,
);
