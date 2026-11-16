import type { ComparableDealSummary } from "@/lib/deals/dealTypes";

export type DealSortKey = "target" | "acquirer" | "announced" | "value";
export type SortDirection = "asc" | "desc";

export interface DealSort {
  key: DealSortKey;
  direction: SortDirection;
}

/**
 * Next column sort. Text starts A→Z. Dates and disclosed values start with the latest or largest.
 * Clicking the active column flips direction.
 */
export function toggleDealSort(
  current: DealSort | null,
  key: DealSortKey,
): DealSort {
  if (current?.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  const direction = key === "target" || key === "acquirer" ? "asc" : "desc";
  return { key, direction };
}

/** Case-insensitive match on names, announcement label, sector, and deal type. */
export function filterDealRows<T extends ComparableDealSummary>(
  rows: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => {
    const haystack = [
      row.targetName,
      row.acquirerName,
      row.announcedLabel,
      row.sector,
      row.dealType,
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

function textFor(row: ComparableDealSummary, key: DealSortKey): string {
  if (key === "target") return row.targetName;
  if (key === "acquirer") return row.acquirerName;
  return row.announcedDate;
}

/**
 * Sort comparable rows. Undisclosed values stay after every disclosed value
 * in both directions so blanks do not read as zero.
 */
export function sortDealRows<T extends ComparableDealSummary>(
  rows: readonly T[],
  sort: DealSort,
): T[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.key === "value") {
      const aValue = typeof a.dealValue === "number" ? a.dealValue : null;
      const bValue = typeof b.dealValue === "number" ? b.dealValue : null;
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      return (aValue - bValue) * direction;
    }
    return textFor(a, sort.key).localeCompare(textFor(b, sort.key)) *
      direction;
  });
}
