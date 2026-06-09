/** Shared pagination helpers for dataset and upstream proxy routes. */

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 500;

export interface PageParams {
  limit: number;
  offset: number;
}

/** Parse and clamp limit/offset from URL search params. */
export function parsePageParams(
  searchParams: URLSearchParams,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): PageParams {
  const defaultLimit = options.defaultLimit ?? DEFAULT_PAGE_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_PAGE_LIMIT;

  const rawLimit = Number(searchParams.get('limit') ?? defaultLimit);
  const rawOffset = Number(searchParams.get('offset') ?? 0);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(1, Math.floor(rawLimit)), maxLimit)
    : defaultLimit;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;

  return { limit, offset };
}

/** Clamp an integer request parameter with a safe default. */
export function clampInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}
