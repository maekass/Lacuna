/**
 * Observed catalog composition — descriptive shares, not forecasts.
 * The denominator is an outcome-selected catalog.
 */

import { wilsonConfidenceInterval } from "@/lib/fairness/statisticalMethods";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import computedSummary from "@/data/computed-dataset-summary.json";
import { missingInput } from "./estimators";
import type { QuantValue } from "./types";

export const CATALOG_COMPOSITION_LABEL = "Observed catalog composition";

const CATALOG_CAVEAT =
  "Denominator is an outcome-selected catalog; the share describes this catalog, not the women's-health company population.";

const MIN_SECTOR_EVENTS = 5;

export interface CatalogShare {
  label: string;
  successes: number;
  sampleSize: number;
  share: QuantValue<number>;
  interval: [number, number] | null;
  caveat: string;
}

export interface ObservedCatalogComposition {
  label: typeof CATALOG_COMPOSITION_LABEL;
  overall: CatalogShare;
  sectors: CatalogShare[];
  catalogCoverage: CatalogShare;
}

function shareOrGate(
  label: string,
  successes: number,
  sampleSize: number,
  minEvents: number,
): CatalogShare {
  if (successes < minEvents || sampleSize <= 0) {
    return {
      label,
      successes,
      sampleSize,
      share: missingInput(
        `n=${successes} events below the ${minEvents}-event gate`,
      ),
      interval: null,
      caveat: CATALOG_CAVEAT,
    };
  }

  const interval = wilsonConfidenceInterval(successes, sampleSize);
  return {
    label,
    successes,
    sampleSize,
    share: {
      kind: "sufficient",
      value: successes / sampleSize,
      sampleSize,
      confidenceInterval: interval,
      selectionCaveat: CATALOG_CAVEAT,
    },
    interval,
    caveat: CATALOG_CAVEAT,
  };
}

/**
 * Descriptive acquisition shares from the verified catalog plus the
 * already-encoded AOA Dx coverage denominator.
 */
export function observedCatalogComposition(
  dataset: VerifiedDataset,
): ObservedCatalogComposition {
  const targetIds = new Set(dataset.acquisitions.map((deal) => deal.targetId));
  const overall = shareOrGate(
    "catalog overall",
    dataset.acquisitions.length,
    dataset.companies.length,
    1,
  );

  const bySector = new Map<string, { companies: number; events: number }>();
  for (const company of dataset.companies) {
    const current = bySector.get(company.sector) ??
      { companies: 0, events: 0 };
    current.companies += 1;
    if (targetIds.has(company.id)) current.events += 1;
    bySector.set(company.sector, current);
  }

  const sectors = [...bySector.entries()]
    .sort((a, b) => b[1].events - a[1].events || a[0].localeCompare(b[0]))
    .map(([sector, counts]) =>
      shareOrGate(sector, counts.events, counts.companies, MIN_SECTOR_EVENTS)
    );

  const coverageDenominator = computedSummary.headline.coverageDenominator;
  const catalogCoverage = shareOrGate(
    computedSummary.headline.coverageReferenceName,
    dataset.acquisitions.length,
    coverageDenominator,
    1,
  );

  return {
    label: CATALOG_COMPOSITION_LABEL,
    overall,
    sectors,
    catalogCoverage,
  };
}
