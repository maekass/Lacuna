import * as Sentry from "@sentry/nextjs";

/** Normalize unknown throwables into a message string. */
export function errorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

/**
 * Record a non-fatal error that the caller recovers from.
 * Use instead of an empty `catch {}` so degraded paths stay observable.
 * Returns the normalized message so callers can surface it in UI or API bodies.
 */
export function reportError(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {},
): string {
  const message = errorMessage(error);
  console.error(`[${scope}] ${message}`, context);
  Sentry.captureException(
    error instanceof Error ? error : new Error(`${scope}: ${message}`),
    { extra: { scope, ...context } },
  );
  return message;
}

/** Same as `reportError` for expected, low-severity degradations. */
export function reportWarning(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {},
): string {
  const message = errorMessage(error);
  console.warn(`[${scope}] ${message}`, context);
  Sentry.addBreadcrumb({
    category: "degraded",
    message: `${scope}: ${message}`,
    data: context,
    level: "warning",
  });
  return message;
}
