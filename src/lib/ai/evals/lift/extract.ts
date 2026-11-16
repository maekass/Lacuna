/**
 * Deterministic value extraction for lift scoring.
 *
 * Pulls money amounts (normalized to USD millions), calendar dates (ISO),
 * and standalone years out of free text. No model is involved.
 */

export interface ExtractedValues {
  usdMillions: number[];
  isoDates: string[];
  /** Years not already part of a full date. */
  years: number[];
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length)
  .join("|");

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const MONTH_DAY_YEAR = new RegExp(
  `\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`,
  "gi",
);
const DAY_MONTH_YEAR = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALT})\\.?,?\\s+(\\d{4})\\b`,
  "gi",
);
const YEAR = /\b(19\d{2}|20\d{2}|2100)\b/g;

/**
 * Money: "$13.9 billion", "$400M", "US$1,600 million", "13900 million USD",
 * "USD 2.8bn". A bare number with no currency and no scale word is not money.
 */
const MONEY =
  /(?:(US\$|\$|USD\s?)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(trillion|billion|bn|million|mm|thousand|[bmk])?\b|(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(trillion|billion|bn|million|mm)\b(?:\s*(?:USD|US dollars|dollars))?)/gi;

const SCALE_TO_MILLIONS: Record<string, number> = {
  trillion: 1_000_000,
  billion: 1_000,
  bn: 1_000,
  b: 1_000,
  million: 1,
  mm: 1,
  m: 1,
  thousand: 0.001,
  k: 0.001,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isoFromParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Extract money, dates, and years from free text. */
export function extractValues(text: string): ExtractedValues {
  const isoDates: string[] = [];
  const dateSpans: Array<[number, number]> = [];
  const record = (match: RegExpExecArray, iso: string | null) => {
    if (!iso) return;
    isoDates.push(iso);
    dateSpans.push([match.index, match.index + match[0].length]);
  };

  for (const match of text.matchAll(ISO_DATE)) {
    record(
      match,
      isoFromParts(Number(match[1]), Number(match[2]), Number(match[3])),
    );
  }
  for (const match of text.matchAll(MONTH_DAY_YEAR)) {
    const month = MONTHS[match[1].toLowerCase()];
    record(match, isoFromParts(Number(match[3]), month, Number(match[2])));
  }
  for (const match of text.matchAll(DAY_MONTH_YEAR)) {
    const month = MONTHS[match[2].toLowerCase()];
    record(match, isoFromParts(Number(match[3]), month, Number(match[1])));
  }

  const inDate = (index: number) =>
    dateSpans.some(([start, end]) => index >= start && index < end);

  const years: number[] = [];
  for (const match of text.matchAll(YEAR)) {
    if (inDate(match.index)) continue;
    years.push(Number(match[1]));
  }

  const usdMillions: number[] = [];
  for (const match of text.matchAll(MONEY)) {
    if (inDate(match.index)) continue;
    const prefixed = match[1] !== undefined;
    const raw = prefixed ? match[2] : match[4];
    const scaleRaw = (prefixed ? match[3] : match[5])?.toLowerCase();
    const amount = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;
    // "$450" with no scale is dollars, not millions.
    const scale = scaleRaw ? SCALE_TO_MILLIONS[scaleRaw] : 1e-6;
    if (scale === undefined) continue;
    usdMillions.push(Number((amount * scale).toPrecision(12)));
  }

  return {
    usdMillions: unique(usdMillions),
    isoDates: unique(isoDates),
    years: unique(years),
  };
}

/** Relative tolerance for money matches (rounding like 13.9B vs 13900M). */
export const USD_RELATIVE_TOLERANCE = 0.01;

export function usdMatches(left: number, right: number): boolean {
  if (left === right) return true;
  const scale = Math.max(Math.abs(left), Math.abs(right));
  return scale > 0 && Math.abs(left - right) / scale <= USD_RELATIVE_TOLERANCE;
}

/** Lowercase, strip diacritics and punctuation, `&` → `and`. */
export function normalizeEntity(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Whole-token containment of a normalized alias in normalized text. */
export function mentionsEntity(text: string, alias: string): boolean {
  const needle = normalizeEntity(alias);
  if (!needle) return false;
  return ` ${normalizeEntity(text)} `.includes(` ${needle} `);
}
