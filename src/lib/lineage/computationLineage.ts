import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Sources whose bytes change the derived artifacts or the economic values
 * those artifacts read. The hash does not include the artifact JSON itself.
 */
export const COMPUTATION_LINEAGE_FILES = [
  "scripts/compute-acquirer-premiums.ts",
  "scripts/compute-all.ts",
  "scripts/compute-benchmarks.ts",
  "scripts/compute-confidence-intervals.ts",
  "scripts/compute-data-quality.ts",
  "scripts/compute-dataset-summary.ts",
  "scripts/compute-growth-rates.ts",
  "scripts/compute-quality-visibility.ts",
  "scripts/compute-sector-correlations.ts",
  "src/lib/data/dataQualityScores.ts",
  "src/lib/data/evidenceLedger.ts",
  "src/lib/data/qualityVisibility.ts",
  "src/lib/data/replayProvenance.ts",
  "src/lib/data/staticDataset.ts",
  "src/lib/lineage/computationLineage.ts",
  "src/lib/lineage/datasetHash.ts",
] as const;

/** Stable hash of the computation sources the app's artifacts are built from. */
export function hashComputationLineage(root: string): string {
  const hash = createHash("sha256");
  for (const relative of [...COMPUTATION_LINEAGE_FILES].sort()) {
    hash.update(relative);
    hash.update("\0");
    hash.update(readFileSync(join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}
