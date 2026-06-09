import { createHash } from "node:crypto";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type {
  PatientDataAccessMode,
  PatientDataAccessLevel,
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
export function setAuditClickHouseClient(client: ClickHouseClient | null): void {
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
 * Persist audit row to ClickHouse when CLICKHOUSE_URL is configured.
 * Returns false when sink is unavailable (console-only deployments).
 */
export async function writeAuditEvent(
  event: Omit<AuditEventRow, "actor_hash"> & { actor: string },
): Promise<boolean> {
  const client = getAuditClient();
  if (!client) return false;

  const row: AuditEventRow = {
    timestamp: event.timestamp,
    action: event.action,
    resource: sanitizeAuditResource(event.resource),
    actor_hash: hashAuditActor(event.actor),
    allowed: event.allowed,
    mode: event.mode,
  };

  await client.insert({
    table: "audit_events",
    values: [row],
    format: "JSONEachRow",
  });
  return true;
}
