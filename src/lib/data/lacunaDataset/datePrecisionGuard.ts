/**
 * Type-level guard against constructing Date from imprecise announcement data.
 *
 * Prefer {@link dayPrecisionToDate} from `@/lib/data/lacunaDataset`.
 * `new Date(deal.announcedDate)` on a plain string permits placeholder
 * `2023-01-01` values from year-only rows to enter day-resolution series.
 *
 * ESLint: see `no-restricted-syntax` override in eslint.config.mjs targeting
 * `new Date(...)` inside lacunaDataset consumers — use dayPrecisionToDate.
 */
export {};
