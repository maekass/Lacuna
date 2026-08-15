/**
 * Days from announcement to close (inclusive of calendar span, not business days).
 * Returns null when close is missing or precedes announcement.
 */
export function closeDurationDays(
  announcedDate: string,
  closedDate?: string,
): number | null {
  if (!closedDate) return null;
  const announced = Date.parse(`${announcedDate}T00:00:00Z`);
  const closed = Date.parse(`${closedDate}T00:00:00Z`);
  if (!Number.isFinite(announced) || !Number.isFinite(closed)) return null;
  if (closed < announced) return null;
  return Math.round((closed - announced) / 86_400_000);
}

/**
 * Disclosed / pre-deal multiple. Prefer the curated `computedPremium` when present.
 */
export function premiumMultiple(input: {
  computedPremium?: number;
  dealValue?: number;
  preDealValuation?: number;
}): number | null {
  if (
    typeof input.computedPremium === "number" &&
    Number.isFinite(input.computedPremium) &&
    input.computedPremium > 0
  ) {
    return input.computedPremium;
  }
  if (
    typeof input.dealValue === "number" &&
    typeof input.preDealValuation === "number" &&
    input.preDealValuation > 0
  ) {
    return input.dealValue / input.preDealValuation;
  }
  return null;
}

/** Convert a price/pre-deal multiple to a percent premium (1.35 → 35). */
export function premiumPercent(multiple: number): number {
  return (multiple - 1) * 100;
}
