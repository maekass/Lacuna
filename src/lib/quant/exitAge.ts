import type { FoundedPrecision } from "@/lib/data/selectionProvenance";

/** Whole-year age at the first observed acquisition announcement. */
export function exitAgeAtAnnouncement(
  founded: number | undefined,
  precision: FoundedPrecision,
  announcedDate: string | undefined,
): number | null {
  if (
    precision !== "year" || !Number.isInteger(founded) ||
    !announcedDate || !/^\d{4}-\d{2}-\d{2}$/.test(announcedDate)
  ) return null;
  const date = new Date(`${announcedDate}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== announcedDate
  ) return null;
  const age = date.getUTCFullYear() - founded!;
  return age >= 0 ? age : null;
}

/** No substitute median when no dated, year-precision precedents exist. */
export function medianExitAge(ages: readonly number[]): number | null {
  if (ages.length === 0) return null;
  const sorted = [...ages].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Exclude the scored row before computing the observed precedent median. */
export function peerExitAgeMedian(
  ages: ReadonlyMap<string, number | null>,
  scoredId: string,
): number | null {
  const peers: number[] = [];
  for (const [id, age] of ages) {
    if (id !== scoredId && age !== null) peers.push(age);
  }
  return medianExitAge(peers);
}
