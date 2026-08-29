/**
 * Audit-trail failure modes — an access decision must never be silently unaudited.
 *
 * - `clickhouseClient` is null (lazy init skipped: no CLICKHOUSE_URL / not injected):
 *   skip ClickHouse; fall back to Postgres `query()` when DATABASE_URL is set.
 * - ClickHouse `insert` or client init throws: `reportWarning`, then the same Postgres fallback.
 *   Malformed `CLICKHOUSE_URL` (missing http/https) skips ClickHouse instead of throwing.
 * - Postgres unset or `query` throws: `writeAuditEvent` returns false.
 *   Privileged access (authorized / identifiers / raw) is denied with 503 + `reportError`.
 *   Anonymous/redacted reads proceed and increment `droppedAuditEvents` on GET /api/health.
 * - Neither sink configured (console-only): stdout audit only; no 503; counter unchanged.
 */
import process from "node:process";
import { createHash } from "node:crypto";
import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { query } from "@/lib/data/dbClient";
import {
  incrementDroppedAuditCount,
} from "@/lib/compliance/droppedAuditCounter";
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
  const url = process.env.CLICKHOUSE_URL?.trim() || null;
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function getAuditClient(): ClickHouseClient | null {
  if (clickhouseClient) return clickhouseClient;

  const url = getClickHouseUrl();
  if (!url) return null;

  try {
    const database = process.env.CLICKHOUSE_DATABASE?.trim() || "lacuna";
    clickhouseClient = createClient({ url, database });
    return clickhouseClient;
  } catch (err) {
    reportWarning("audit.clickhouse", err, {
      detail: "ClickHouse client init failed, trying Postgres",
    });
    clickhouseClient = null;
    return null;
  }
}

function isPostgresConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

/** Map HIPAA access level onto `006_audit_events` action CHECK values. */
function toPostgresAction(
  action: PatientDataAccessLevel,
): "read" | "export" | "query" {
  if (action === "download_raw") return "export";
  if (action === "read_identifiers") return "query";
  return "read";
}

/** Map route keys onto `006_audit_events` resource_type CHECK values. */
function toPostgresResourceType(
  resource: string,
): "callset" | "variant" | "vcf_object" | "query_result" {
  if (/callsets\/object|\bobject\b/i.test(resource)) return "vcf_object";
  if (/callset/i.test(resource)) return "callset";
  if (/variant/i.test(resource)) return "variant";
  return "query_result";
}

/** Map governance mode onto `006_audit_events` mode CHECK values. */
function toPostgresMode(
  mode: PatientDataAccessMode,
): "production" | "development" | "test" {
  if (mode === "authorized") return "production";
  if (mode === "blocked") return "test";
  return "development";
}

/** True when at least one durable audit sink is configured for this deployment. */
export function isAuditSinkConfigured(): boolean {
  return !!clickhouseClient ||
    !!process.env.CLICKHOUSE_URL?.trim() ||
    isPostgresConfigured();
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
 * Returns false when no sink accepted the write.
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

  let chClient: ClickHouseClient | null = null;
  try {
    chClient = getAuditClient();
    if (chClient) {
      await chClient.insert({
        table: "audit_events",
        values: [row],
        format: "JSONEachRow",
      });
      return true;
    }
  } catch (err) {
    reportWarning("audit.clickhouse", err, {
      detail: "ClickHouse audit write failed, trying Postgres",
    });
  }

  if (isPostgresConfigured()) {
    try {
      await query(
        `INSERT INTO audit_events (
          timestamp, action, resource_type, resource_hash,
          actor_ip_hash, allowed, mode, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.timestamp,
          toPostgresAction(row.action),
          toPostgresResourceType(row.resource),
          hashAuditActor(row.resource),
          row.actor_hash,
          row.allowed === 1,
          toPostgresMode(row.mode),
          {
            action: row.action,
            mode: row.mode,
            resource_hash: hashAuditActor(row.resource),
          },
        ],
      );
      return true;
    } catch (err) {
      reportError("audit.postgres", err, {
        detail: "Postgres audit write failed",
      });
    }
  }

  const attempted = Boolean(chClient) || isPostgresConfigured();
  if (attempted) {
    incrementDroppedAuditCount();
    reportError(
      "audit.dropped",
      new Error("Audit event dropped: every configured sink failed"),
      { action: row.action, resource: row.resource, mode: row.mode },
    );
  }

  return false;
}
