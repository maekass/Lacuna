import { query } from "@/lib/data/dbClient";
import type { Pool } from "pg";
import type { ReviewAuthMethod } from "@/lib/infra/reviewSession";

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
    actorId: row.actor_id,
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
    input.actorId,
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
