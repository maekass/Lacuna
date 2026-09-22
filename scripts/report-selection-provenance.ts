#!/usr/bin/env npx tsx

/**
 * Print the catalog-selection profile from the verified dataset.
 */

import { getStaticVerifiedDataset } from "../src/lib/data/staticDataset";
import type {
  CatalogEntryReason,
  OutcomeType,
} from "../src/lib/data/selectionProvenance";

function countBy<T extends string>(
  values: readonly T[],
): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const value of values) {
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

function main() {
  const dataset = getStaticVerifiedDataset();
  const reasons = dataset.companies.map((c) =>
    c.catalogEntryReason as CatalogEntryReason
  );
  const outcomes = dataset.companies.map((c) => c.outcomeType as OutcomeType);
  const acquiredCount = outcomes.filter((o) => o === "acquired").length;
  const missingFounded =
    dataset.companies.filter((c) => c.founded === undefined).length;

  console.log("catalogEntryReason");
  console.log(countBy(reasons));
  console.log("outcomeType");
  console.log(countBy(outcomes));
  console.log(
    `acquired ${acquiredCount} / acquisitions ${dataset.acquisitions.length}`,
  );
  console.log(
    `missing founded ${missingFounded} / companies ${dataset.companies.length}`,
  );
}

main();
