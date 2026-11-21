import { query } from "@/lib/data/dbClient";
import type { Pool } from "pg";
import type { ReviewAuthMethod } from "@/lib/infra/reviewSession";
import {
  encryptField,
  type FieldKeyring,
  needsFieldRotation,
  readEncryptedOrLegacyField,
  rotateField,
} from "@/lib/infra/fieldEncryption";

/** AAD context for the encrypted reviewer identity column. */
export const REVIEW_AUDIT_ACTOR_CONTEXT = "review_audit_log.actor_id";

export type ReviewAuditAction =
  | "approve"
  | "reject"
  | "promote"
  | "enrich"
  | "import"
  | "session_start"
  | "session_end";

export interface ReviewAuditLogInput {
  dealId?: string | null;
  action: ReviewAuditAction;
  actorId: string;
  actorMethod: ReviewAuthMethod;
  metadata?: Record<string, unknown>;
}

export interface ReviewAuditLogRow {
  id: number;
  dealId: string | null;
  action: ReviewAuditAction;
  actorId: string;
  actorMethod: ReviewAuthMethod;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ReviewAuditLogDbRow {
  id: number;
  deal_id: string | null;
  action: ReviewAuditAction;
  actor_id: string;
  actor_method: ReviewAuthMethod;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
}

function mapRow(row: ReviewAuditLogDbRow): ReviewAuditLogRow {
  return {
    id: row.id,
    dealId: row.deal_id,
    action: row.action,
    actorId: readEncryptedOrLegacyField(
      row.actor_id,
      REVIEW_AUDIT_ACTOR_CONTEXT,
    ),
    actorMethod: row.actor_method,
    metadata: row.metadata ?? {},
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString(),
  };
}

/** Append one review-console audit event (approve, reject, promote, …). */
export async function logReviewAction(
  input: ReviewAuditLogInput,
): Promise<ReviewAuditLogRow> {
  const rows = await query<ReviewAuditLogDbRow>(
    `INSERT INTO review_audit_log (
      deal_id, action, actor_id, actor_method, metadata
    ) VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING id, deal_id, action, actor_id, actor_method, metadata, created_at`,
    auditParams(input),
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to insert review audit log row");
  }
  return mapRow(row);
}

/** Best-effort audit insert — sign-in must not fail if the log table is down. */
export async function tryLogReviewAction(
  input: ReviewAuditLogInput,
): Promise<void> {
  try {
    await logReviewAction(input);
  } catch (error) {
    console.error("review audit log failed:", error);
  }
}

function auditParams(input: ReviewAuditLogInput): unknown[] {
  return [
    input.dealId ?? null,
    input.action,
    encryptField(input.actorId, REVIEW_AUDIT_ACTOR_CONTEXT),
    input.actorMethod,
    JSON.stringify(input.metadata ?? {}),
  ];
}

/** Same as logReviewAction but participates in an open transaction. */
export async function logReviewActionWithClient(
  client: Pick<Pool, "query">,
  input: ReviewAuditLogInput,
): Promise<ReviewAuditLogRow> {
  const result = await client.query<ReviewAuditLogDbRow>(
    `INSERT INTO review_audit_log (
      deal_id, action, actor_id, actor_method, metadata
    ) VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING id, deal_id, action, actor_id, actor_method, metadata, created_at`,
    auditParams(input),
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to insert review audit log row");
  }
  return mapRow(row);
}

/** Recent audit events for a deal (newest first). */
export async function listReviewAuditForDeal(
  dealId: string,
  limit = 20,
): Promise<ReviewAuditLogRow[]> {
  const rows = await query<ReviewAuditLogDbRow>(
    `SELECT id, deal_id, action, actor_id, actor_method, metadata, created_at
     FROM review_audit_log
     WHERE deal_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [dealId, limit],
  );
  return rows.map(mapRow);
}

export interface RotateReviewAuditResult {
  scanned: number;
  rotated: number;
  /** Rows whose legacy plaintext `metadata.login` copy was removed. */
  scrubbed: number;
}

/**
 * GitHub sign-in rows written before field encryption also copied the login
 * into `metadata.login`. Return metadata without that duplicate, or null when
 * the row has nothing to remove. Other metadata keys are preserved.
 */
export function withoutLegacyLogin(
  metadata: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!metadata || metadata.provider !== "github" || !("login" in metadata)) {
    return null;
  }
  const { login: _login, ...rest } = metadata;
  return rest;
}

/**
 * Re-encrypt `actor_id` under the active key: rows under an older key and
 * legacy plaintext rows from before encryption. Also removes the legacy
 * plaintext `metadata.login` copy from GitHub sign-in rows. Walks by id so a
 * dry run terminates. Each row is updated only if it still holds the value read.
 */
export async function rotateReviewAuditActorIds(
  client: Pick<Pool, "query">,
  keyring: FieldKeyring,
  options: { dryRun?: boolean; batchSize?: number } = {},
): Promise<RotateReviewAuditResult> {
  const batchSize = options.batchSize ?? 500;
  let cursor = 0;
  let scanned = 0;
  let rotated = 0;
  let scrubbed = 0;

  for (;;) {
    const { rows } = await client.query<{
      id: number;
      actor_id: string;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, actor_id, metadata FROM review_audit_log
       WHERE id > $1
       ORDER BY id
       LIMIT $2`,
      [cursor, batchSize],
    );
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      cursor = Number(row.id);
      const rotate = needsFieldRotation(row.actor_id, keyring);
      const metadata = withoutLegacyLogin(row.metadata);
      if (!rotate && !metadata) continue;
      if (rotate) rotated += 1;
      if (metadata) scrubbed += 1;
      if (options.dryRun) continue;
      const next = rotate
        ? rotateField(row.actor_id, REVIEW_AUDIT_ACTOR_CONTEXT, keyring)
        : row.actor_id;
      await client.query(
        metadata
          ? `UPDATE review_audit_log SET actor_id = $1, metadata = $4::jsonb
             WHERE id = $2 AND actor_id = $3`
          : `UPDATE review_audit_log SET actor_id = $1
             WHERE id = $2 AND actor_id = $3`,
        metadata
          ? [next, row.id, row.actor_id, JSON.stringify(metadata)]
          : [next, row.id, row.actor_id],
      );
    }
  }

  return { scanned, rotated, scrubbed };
}
