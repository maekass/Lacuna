import { Pool } from "pg";

export interface DatabaseUrlMeta {
  host: string;
  port: string;
  database: string;
  user: string;
  hasPassword: boolean;
  isLocalhost: boolean;
  isNeon: boolean;
  isPooledNeon: boolean;
  sslmode: string | null;
}

export interface DatabasePingResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
  serverVersion?: string;
  migrationCount?: number;
}

export function parseDatabaseUrl(
  connectionString: string,
): DatabaseUrlMeta | null {
  try {
    const normalized = connectionString.replace(/^postgresql:/, "http:");
    const url = new URL(normalized);
    const host = url.hostname;
    return {
      host,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, "") || "postgres",
      user: decodeURIComponent(url.username),
      hasPassword: url.password.length > 0,
      isLocalhost: host === "localhost" || host === "127.0.0.1",
      isNeon: host.includes(".neon.tech"),
      isPooledNeon: host.includes("-pooler") && host.includes(".neon.tech"),
      sslmode: url.searchParams.get("sslmode"),
    };
  } catch {
    return null;
  }
}

/** Redact credentials for logs. */
export function redactDatabaseUrl(connectionString: string): string {
  const meta = parseDatabaseUrl(connectionString);
  if (!meta) return "[invalid DATABASE_URL]";

  try {
    const normalized = connectionString.replace(/^postgresql:/, "http:");
    const url = new URL(normalized);
    if (url.password) url.password = "****";
    if (url.username) url.username = meta.user;
    const rebuilt = url.toString().replace(/^http:/, "postgresql:");
    return rebuilt;
  } catch {
    return "[invalid DATABASE_URL]";
  }
}

export async function pingDatabase(
  connectionString: string,
): Promise<DatabasePingResult> {
  const started = Date.now();
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.PGSSLMODE === "disable"
      ? undefined
      : { rejectUnauthorized: false },
  });

  try {
    const versionResult = await pool.query<{ version: string }>(
      "SELECT version() AS version",
    );
    const migrationResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'lacuna_schema_migrations'`,
    );
    let migrationCount = 0;
    if (migrationResult.rows[0]?.count === "1") {
      const applied = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM lacuna_schema_migrations",
      );
      migrationCount = Number(applied.rows[0]?.count ?? 0);
    }

    return {
      ok: true,
      latencyMs: Date.now() - started,
      serverVersion: versionResult.rows[0]?.version,
      migrationCount,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await pool.end();
  }
}

export function suggestFix(
  error: string,
  meta: DatabaseUrlMeta | null,
): string[] {
  const tips: string[] = [];
  if (error.includes("ENOTFOUND")) {
    tips.push(
      "Host does not resolve — copy a fresh pooled connection string from Neon → Connect.",
    );
    tips.push(
      "Update Vercel → Settings → Environment Variables → DATABASE_URL, then redeploy.",
    );
  }
  if (error.includes("ECONNREFUSED") && meta?.isLocalhost) {
    tips.push("Start local Postgres: docker compose up -d postgres");
  }
  if (meta?.isNeon && !meta.isPooledNeon) {
    tips.push(
      "Neon: enable Connection pooling in the Connect dialog (hostname should include -pooler).",
    );
  }
  if (meta?.isNeon && process.env.PGSSLMODE === "disable") {
    tips.push(
      "Remove PGSSLMODE=disable from .env.local when using Neon (SSL is required).",
    );
  }
  return tips;
}
