#!/usr/bin/env npx tsx

/**
 * One-shot backfill of catalog-selection provenance on
 * dataset.verified.json. Recovers reason/outcome from existing fields
 * only; does not impute founding years or catalog dates.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import verifiedJson from "../src/data/dataset.verified.json";
import {
  deriveCatalogEntryReason,
  deriveFoundedPrecision,
  deriveOutcomeType,
} from "../src/lib/data/selectionProvenance";
import { parseVerifiedDataset } from "../src/lib/data/datasetSchema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "../src/data/dataset.verified.json");

function main() {
  const targetIds = new Set(
    verifiedJson.acquisitions.map((deal) => deal.targetId),
  );

  const companies = verifiedJson.companies.map((company) => {
    const isTarget = targetIds.has(company.id);
    const next = {
      ...company,
      foundedPrecision: deriveFoundedPrecision(company.founded),
      catalogEntryReason: deriveCatalogEntryReason(company.sources, isTarget),
      catalogEntryDate: null,
      outcomeType: deriveOutcomeType(isTarget),
    };
    return next;
  });

  const dataset = {
    ...verifiedJson,
    provenance: {
      ...verifiedJson.provenance,
      lastUpdated: "2026-09-20",
      datasetVersion: "v9",
      notes: [
        ...verifiedJson.provenance.notes,
        "2026-09-20: Added catalogEntryReason, catalogEntryDate, foundedPrecision, and outcomeType. Missing founding years stay absent (foundedPrecision=unknown). Non-acquired outcomes are unknown, not still-private. catalogEntryDate is null where add-date is not recoverable.",
      ],
    },
    companies,
  };

  parseVerifiedDataset(dataset);
  writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`Wrote selection provenance for ${companies.length} companies`);
}

main();
