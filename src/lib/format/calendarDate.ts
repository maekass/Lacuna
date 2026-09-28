/**
 * Calendar year of a `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` string, read from the
 * string itself — no Date parsing, so the viewer's timezone cannot shift it.
 */
export function calendarYear(isoDate: string): number | null {
  const match = /^(\d{4})(?:-\d{2}(?:-\d{2})?)?(?:$|T)/.exec(isoDate);
  return match ? Number(match[1]) : null;
}
