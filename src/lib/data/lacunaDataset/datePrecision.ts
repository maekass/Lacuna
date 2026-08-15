/**
 * Date precision as a type-level constraint.
 *
 * Imprecise dates are unusable in day-resolution analysis — not merely labeled.
 * All temporal ops work on intervals; ambiguous orderings return indeterminate.
 */

import type { AnnouncedDate, DatePrecision, LacunaDeal } from "./types";

export type DateInterval = readonly [earliest: string, latest: string];

export type IntervalOrder =
  | { readonly kind: "before" }
  | { readonly kind: "after" }
  | { readonly kind: "indeterminate"; readonly reason: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseYearMonth(yearMonth: string): { year: number; month: number } {
  if (!MONTH.test(yearMonth)) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }
  const [ys, ms] = yearMonth.split("-");
  const year = Number(ys);
  const month = Number(ms);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }
  return { year, month };
}

/** Earliest/latest calendar bounds for an announced date. */
export function toInterval(announced: AnnouncedDate): DateInterval {
  if (announced.precision === "day") {
    if (!DAY.test(announced.date)) {
      throw new Error(`Invalid day date: ${announced.date}`);
    }
    return [announced.date, announced.date];
  }
  if (announced.precision === "month") {
    const { year, month } = parseYearMonth(announced.yearMonth);
    const last = daysInMonth(year, month);
    return [
      `${year}-${pad(month)}-01`,
      `${year}-${pad(month)}-${pad(last)}`,
    ];
  }
  const year = announced.year;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error(`Invalid year: ${year}`);
  }
  return [`${year}-01-01`, `${year}-12-31`];
}

const PRECISION_RANK: Record<DatePrecision, number> = {
  day: 0,
  month: 1,
  year: 2,
};

/** True when announced precision is at least as fine as the requested floor. */
export function meetsPrecisionFloor(
  announced: AnnouncedDate,
  floor: DatePrecision,
): boolean {
  return PRECISION_RANK[announced.precision] <= PRECISION_RANK[floor];
}

/**
 * Compare two intervals. Overlap or nested bounds → indeterminate
 * (does not silently pick a point).
 */
export function compareIntervals(
  a: DateInterval,
  b: DateInterval,
): IntervalOrder {
  if (a[1] < b[0]) return { kind: "before" };
  if (b[1] < a[0]) return { kind: "after" };
  return {
    kind: "indeterminate",
    reason: `Intervals [${a[0]}, ${a[1]}] and [${b[0]}, ${b[1]}] overlap`,
  };
}

export interface TimeSeriesBucket {
  readonly key: string;
  readonly dealIds: readonly string[];
  readonly disclosedValueMillions: number;
}

export interface TimeSeriesResult {
  readonly precisionFloor: DatePrecision;
  readonly buckets: readonly TimeSeriesBucket[];
  readonly excluded: ReadonlyArray<{
    readonly dealId: string;
    readonly reason: string;
    readonly announced: AnnouncedDate;
  }>;
}

function bucketKey(announced: AnnouncedDate, floor: DatePrecision): string {
  const [earliest] = toInterval(announced);
  if (floor === "year") return earliest.slice(0, 4);
  if (floor === "month") return earliest.slice(0, 7);
  return earliest;
}

/**
 * Build a time series at an explicit precision floor.
 * Rows that fail the floor are returned in `excluded` — never silently dropped.
 */
export function timeSeries(
  deals: readonly LacunaDeal[],
  precisionFloor: DatePrecision,
): TimeSeriesResult {
  const excluded: TimeSeriesResult["excluded"][number][] = [];
  const map = new Map<string, { dealIds: string[]; value: number }>();

  for (const deal of deals) {
    if (!meetsPrecisionFloor(deal.announced, precisionFloor)) {
      excluded.push({
        dealId: deal.id,
        reason:
          `announced.precision=${deal.announced.precision} coarser than floor=${precisionFloor}`,
        announced: deal.announced,
      });
      continue;
    }
    const key = bucketKey(deal.announced, precisionFloor);
    const row = map.get(key) ?? { dealIds: [], value: 0 };
    row.dealIds.push(deal.id);
    if (typeof deal.dealValueMillions === "number") {
      row.value += deal.dealValueMillions;
    }
    map.set(key, row);
  }

  const buckets = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({
      key,
      dealIds: row.dealIds,
      disclosedValueMillions: row.value,
    }));

  return { precisionFloor, buckets, excluded };
}

/**
 * Type-level guard: only day-precision announced dates may construct a Date.
 * Prefer this over `new Date(deal.announcedDate)` on unverified strings.
 */
export function dayPrecisionToDate(
  announced: Extract<AnnouncedDate, { precision: "day" }>,
): Date {
  if (!DAY.test(announced.date)) {
    throw new Error(`Invalid day date: ${announced.date}`);
  }
  return new Date(`${announced.date}T00:00:00.000Z`);
}

/** Parse verified YYYY-MM-DD into day precision; refuse placeholders via caller policy. */
export function announcedFromIsoDay(isoDate: string): AnnouncedDate {
  if (!DAY.test(isoDate)) {
    throw new Error(`Expected YYYY-MM-DD, got ${isoDate}`);
  }
  return { precision: "day", date: isoDate };
}
