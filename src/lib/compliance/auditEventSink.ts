import process from "node:process";
import { createHash } from "node:crypto";
import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { query } from "@/lib/data/dbClient";
import { reportError, reportWarning } from "@/lib/observability/reportError";
import type {
  PatientDataAccessLevel,
  PatientDataAccessMode,
} from "@/lib/compliance/patientDataGovernance";

export interface AuditEventRow {
  timestamp: string;
  action: PatientDataAccessLevel;
  resource: string;
  actor_hash: string;
  allowed: 0 | 1;
  mode: PatientDataAccessMode;
}

let clickhouseClient: ClickHouseClient | null = null;

/** @internal Test hook — inject or disable ClickHouse client. */
export function setAuditClickHouseClient(
  client: ClickHouseClient | null,
): void {
  if (client) {
    clickhouseClient = client;
    return;
  }
  clickhouseClient = null;
}

function getClickHouseUrl(): string | null {
  return process.env.CLICKHOUSE_URL?.trim() || null;
}

function getAuditClient(): ClickHouseClient | null {
  if (clickhouseClient) return clickhouseClient;

  const url = getClickHouseUrl();
  if (!url) return null;

  const database = process.env.CLICKHOUSE_DATABASE?.trim() || "lacuna";
  clickhouseClient = createClient({ url, database });
  return clickhouseClient;
}

function isPostgresConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/** True when at least one durable audit sink is configured for this deployment. */
export function isAuditSinkConfigured(): boolean {
  return !!clickhouseClient || !!getClickHouseUrl() || isPostgresConfigured();
}

/** SHA-256 hash of client IP — never store raw IPs in audit rows. */
export function hashAuditActor(actor: string): string {
  const salt = process.env.LACUNA_AUDIT_SALT?.trim() || "lacuna-audit-dev";
  return createHash("sha256").update(`${salt}:${actor}`).digest("hex");
}

/**
 * Strip sample identifiers and VCF/object paths from audit resource labels.
 * API routes should pass route keys only; this guards against accidental PHI.
 */
export function sanitizeAuditResource(resource: string): string {
  const trimmed = resource.trim().slice(0, 256);
  if (
    /\.vcf/i.test(trimmed) ||
    /s3:\/\//i.test(trimmed) ||
    /gs:\/\//i.test(trimmed) ||
    /sample[-_]?id/i.test(trimmed)
  ) {
    return "genomics/[redacted]";
  }
  return trimmed;
}

/**
 * Persist audit row to ClickHouse when CLICKHOUSE_URL is configured,
 * falling back to Postgres when DATABASE_URL is set.
 * Returns false when no sink is available (console-only deployments).
 */
export async function writeAuditEvent(
  event: Omit<AuditEventRow, "actor_hash"> & { actor: string },
): Promise<boolean> {
  const row: AuditEventRow = {
    timestamp: event.timestamp,
    action: event.action,
    resource: sanitizeAuditResource(event.resource),
    actor_hash: hashAuditActor(event.actor),
    allowed: event.allowed,
    mode: event.mode,
  };

  // Try ClickHouse first (preferred for high-volume analytics)
  const chClient = getAuditClient();
  if (chClient) {
    try {
      await chClient.insert({
        table: "audit_events",
        values: [row],
        format: "JSONEachRow",
      });
      return true;
    } catch (err) {
      reportWarning("audit.clickhouse", err, {
        detail: "ClickHouse audit write failed, trying Postgres",
      });
    }
  }

  // Fall back to Postgres
  if (isPostgresConfigured()) {
    try {
      await query(
        `INSERT INTO audit_events (
          timestamp, action, resource_type, resource_hash,
          actor_ip_hash, allowed, mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.timestamp,
          row.action,
          "audit_event",
          row.resource,
          row.actor_hash,
          row.allowed === 1,
          row.mode,
        ],
      );
      return true;
    } catch (err) {
      reportError("audit.postgres", err, {
        detail: "Postgres audit write failed",
      });
    }
  }

  return false;
}
