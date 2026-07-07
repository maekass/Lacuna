import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { ComparableDealSummary } from "./dealTypes";

const DEFAULT_LIMIT = 5;

/**
 * Lists other verified acquisitions by the same acquirer, excluding the reference deal.
 */
export function listAcquirerDeals(
  dataset: VerifiedDataset,
  dealId: string,
  limit = DEFAULT_LIMIT,
): ComparableDealSummary[] {
  const reference = dataset.acquisitions.find((a) => a.id === dealId);
  if (!reference) return [];

  return dataset.acquisitions
    .filter((a) => a.id !== dealId && a.acquirerId === reference.acquirerId)
    .map((a): ComparableDealSummary => {
      const sector = dataset.companies.find((c) =>
        c.id === a.targetId
      )?.sector ?? "Unknown";
      return {
        id: a.id,
        targetName: a.targetName,
        acquirerName: a.acquirerName,
        announcedDate: a.announcedDate,
        dealValue: a.dealValue,
        dealType: a.dealType,
        sector,
      };
    })
    .sort((a, b) => b.announcedDate.localeCompare(a.announcedDate))
    .slice(0, limit);
}
