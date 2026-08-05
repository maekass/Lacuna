/**
 * Coercion helpers for Postgres row values shared by the ingestion mappers.
 *
 * `pg` returns `date`/`timestamptz` columns as `Date` (or `string` when a row
 * comes from a JSON snapshot) and `numeric` columns as `string`, so mappers
 * normalise both shapes before exposing records to the app.
 */

/** Normalise a date column to `YYYY-MM-DD`, preserving `null`. */
export function toIsoDate(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

/** Normalise a timestamp column to a full ISO-8601 string. */
export function toIsoDateTime(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

/** Normalise a numeric column, returning `null` for non-finite values. */
export function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
