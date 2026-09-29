/** Inclusive start of a partial ISO date, used only for ordering checks. */
export function periodStart(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return `${value}-01-01`;
}

/** Inclusive end of a partial ISO date, used only for ordering checks. */
export function periodEnd(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [yearText, monthText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${value}-${String(last).padStart(2, "0")}`;
  }
  return `${value}-12-31`;
}

/**
 * True when `later` ends before `earlier` begins.
 * Overlapping partial periods are not treated as ordering violations.
 */
export function isEntirelyBefore(later: string, earlier: string): boolean {
  return periodEnd(later) < periodStart(earlier);
}
