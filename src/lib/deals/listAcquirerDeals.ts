import { formatDealDate } from "./formatDealDate";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { ComparableDealSummary } from "./dealTypes";

const DEFAULT_LIMIT = 5;

/**
 * Lists other verified acquisitions by the same acquirer, excluding the
 * reference deal and any ids already shown as peers or adjacency.
 */
export function listAcquirerDeals(
  dataset: VerifiedDataset,
  dealId: string,
  limit = DEFAULT_LIMIT,
  excludeIds: ReadonlySet<string> = new Set(),
): ComparableDealSummary[] {
  const reference = dataset.acquisitions.find((a) => a.id === dealId);
  if (!reference) return [];

  return dataset.acquisitions
    .filter((a) =>
      a.id !== dealId &&
      a.acquirerId === reference.acquirerId &&
      !excludeIds.has(a.id)
    )
    .map((a): ComparableDealSummary => {
      const sector = dataset.companies.find((c) =>
        c.id === a.targetId
      )?.sector ?? "Unknown";
      return {
        id: a.id,
        targetName: a.targetName,
        acquirerName: a.acquirerName,
        announcedDate: a.announcedDate,
        announcedLabel: formatDealDate(a.announcedDate),
        dealValue: a.dealValue,
        dealType: a.dealType,
        sector,
      };
    })
    .sort((a, b) => b.announcedDate.localeCompare(a.announcedDate))
    .slice(0, limit);
}
