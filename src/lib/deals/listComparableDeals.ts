import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { ComparableDealSummary } from "./dealTypes";

const DEFAULT_LIMIT = 5;
const YEAR_WINDOW = 3;

function targetSector(dataset: VerifiedDataset, targetId: string): string | null {
  return dataset.companies.find((c) => c.id === targetId)?.sector ?? null;
}

function announcementYear(isoDate: string): number {
  return Number.parseInt(isoDate.slice(0, 4), 10);
}

/**
 * Lists peer deals in the same target sector within ±`yearWindow` years of
 * the reference announcement. Excludes the reference deal.
 */
export function listComparableDeals(
  dataset: VerifiedDataset,
  dealId: string,
  limit = DEFAULT_LIMIT,
  yearWindow = YEAR_WINDOW,
): ComparableDealSummary[] {
  const reference = dataset.acquisitions.find((a) => a.id === dealId);
  if (!reference) return [];

  const sector = targetSector(dataset, reference.targetId);
  if (!sector) return [];

  const refYear = announcementYear(reference.announcedDate);

  const candidates = dataset.acquisitions
    .filter((a) => {
      if (a.id === dealId) return false;
      const candidateSector = targetSector(dataset, a.targetId);
      if (candidateSector !== sector) return false;
      const delta = Math.abs(announcementYear(a.announcedDate) - refYear);
      return delta <= yearWindow;
    })
    .map((a): ComparableDealSummary => ({
      id: a.id,
      targetName: a.targetName,
      acquirerName: a.acquirerName,
      announcedDate: a.announcedDate,
      dealValue: a.dealValue,
      dealType: a.dealType,
      sector,
    }))
    .sort((a, b) => {
      const yearDeltaA = Math.abs(announcementYear(a.announcedDate) - refYear);
      const yearDeltaB = Math.abs(announcementYear(b.announcedDate) - refYear);
      if (yearDeltaA !== yearDeltaB) return yearDeltaA - yearDeltaB;
      return b.announcedDate.localeCompare(a.announcedDate);
    });

  return candidates.slice(0, limit);
}
