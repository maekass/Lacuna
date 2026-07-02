/** Standard copy for every analytical panel — keep in sync with README hero. */
export const CURATED_DATASET_PROVENANCE_TEMPLATE =
  "Curated dataset · n={dealCount} verified deals · Not live market data · Scores are descriptive, not forecasts.";

/** Build provenance copy with the live verified deal count. */
export function formatCuratedDatasetProvenanceLine(dealCount: number): string {
  return CURATED_DATASET_PROVENANCE_TEMPLATE.replace(
    "{dealCount}",
    String(dealCount),
  );
}
