/** Fixture and export metrics. These are not adjudicated performance claims. */

export function retrievalRecallAtK(
  retrievedIds: readonly string[],
  relevantIds: readonly string[],
): number | null {
  if (relevantIds.length === 0) return null;
  const retrieved = new Set(retrievedIds);
  const hit = relevantIds.filter((id) => retrieved.has(id)).length;
  return hit / relevantIds.length;
}

export function retrievalPrecisionAtK(
  retrievedIds: readonly string[],
  relevantIds: readonly string[],
): number | null {
  if (retrievedIds.length === 0) return null;
  const relevant = new Set(relevantIds);
  const hit = retrievedIds.filter((id) => relevant.has(id)).length;
  return hit / retrievedIds.length;
}

export function citationResolutionRate(
  citedIds: readonly string[],
  retrievedIds: readonly string[],
): number | null {
  if (citedIds.length === 0) return null;
  const retrieved = new Set(retrievedIds);
  const resolved = citedIds.filter((id) => retrieved.has(id)).length;
  return resolved / citedIds.length;
}
