/**
 * Postgres TLS policy: `PGSSLMODE=disable` is localhost-only.
 * Remote hosts (including Neon) must not turn TLS off.
 */

/** Hosts where plaintext Postgres is an explicit local-dev exception. */
export function isLocalPostgresHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  );
}

/** Hostname from a postgres:// or postgresql:// URL, or null if unparseable. */
export function hostFromDatabaseUrl(connectionString: string): string | null {
  try {
    const url = new URL(connectionString.replace(/^postgresql:/i, "http:"));
    return url.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Refuse `PGSSLMODE=disable` against a non-local host.
 * Warning-only was ignored by four CI steps that write the verified dataset.
 */
export function assertRemotePostgresTlsEnabled(
  connectionString = process.env.DATABASE_URL ?? "",
): void {
  if (process.env.PGSSLMODE !== "disable") return;
  if (!connectionString) return;
  const host = hostFromDatabaseUrl(connectionString);
  if (!host) return;
  if (isLocalPostgresHost(host)) return;
  throw new Error(
    `PGSSLMODE=disable is not allowed for remote host ${host}. ` +
      `Unset PGSSLMODE (TLS verify-on) or restrict disable to localhost / 127.0.0.1 / ::1 / *.local.`,
  );
}
