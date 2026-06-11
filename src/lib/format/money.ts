/** Format USD amounts stored in millions (M) for display. */
export function formatMoneyMillions(valueM: number): string {
  if (!Number.isFinite(valueM) || valueM <= 0) return "—";
  if (valueM >= 1000) {
    const b = valueM / 1000;
    return b >= 10 ? `$${b.toFixed(0)}B` : `$${b.toFixed(1)}B`;
  }
  return `$${Math.round(valueM)}M`;
}
