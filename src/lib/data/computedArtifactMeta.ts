/**
 * Stable metadata for dataset-derived JSON artifacts.
 * Uses provenance date (not wall clock) so CI `compute:all` + `verify:computed` is deterministic.
 */
export function generatedAtFromProvenance(lastUpdated: string): string {
  return `${lastUpdated}T00:00:00.000Z`;
}
