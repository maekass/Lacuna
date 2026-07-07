import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { DealDetail } from "./dealTypes";
import { FEATURED_DEAL_ID } from "./dealTypes";
import { getDealById } from "./getDealById";

const WOMENS_HEALTH_SECTOR_HINTS = [
  "fertility",
  "maternal",
  "women",
  "femtech",
  "reproductive",
  "obstetric",
  "gynecolog",
];

function sectorScore(sector: string): number {
  const lower = sector.toLowerCase();
  return WOMENS_HEALTH_SECTOR_HINTS.some((hint) => lower.includes(hint))
    ? 1
    : 0;
}

/**
 * Returns the canonical featured deal when present; otherwise the best
 * disclosed, well-sourced women's-health acquisition by announcement date.
 */
export function getFeaturedDeal(dataset: VerifiedDataset): DealDetail | null {
  const pinned = getDealById(dataset, FEATURED_DEAL_ID);
  if (pinned) return pinned;

  const ranked = dataset.acquisitions
    .filter((a) => a.dealValue !== undefined && a.source.trim().length > 0)
    .map((a) => {
      const target = dataset.companies.find((c) => c.id === a.targetId);
      const score = target ? sectorScore(target.sector) : 0;
      return { id: a.id, score, announcedDate: a.announcedDate };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.announcedDate.localeCompare(a.announcedDate);
    });

  const top = ranked[0];
  if (!top) return null;
  return getDealById(dataset, top.id);
}
