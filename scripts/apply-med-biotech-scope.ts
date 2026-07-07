/**
 * Apply dataset scope filters (dry-run). The canonical catalog stays complete in
 * dataset.verified.json; workspaces filter in memory via applyDatasetScope().
 * Run: node --import tsx scripts/apply-med-biotech-scope.ts [med_biotech|consumer_health]
 */
import type { DatasetScope } from "../src/lib/data/medBiotechFilters";
import { applyDatasetScope, DATASET_SCOPE_LABELS } from "../src/lib/data/medBiotechFilters";
import verifiedJson from "../src/data/dataset.verified.json";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";

const scope = (process.argv[2] ?? "med_biotech") as DatasetScope;
const dataset = verifiedJson as VerifiedDataset;
const scoped = applyDatasetScope(dataset, scope);

console.log(
  `${DATASET_SCOPE_LABELS[scope]}: ${scoped.companies.length} companies, ${scoped.acquisitions.length} acquisitions`,
);
