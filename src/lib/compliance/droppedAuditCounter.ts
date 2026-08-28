/**
 * Process-local count of patient-data audit rows that no durable sink accepted.
 * Surfaced on GET /api/health as `droppedAuditEvents`.
 */

let droppedAuditCount = 0;

/** Number of audit events dropped since process start (or last test reset). */
export function getDroppedAuditCount(): number {
  return droppedAuditCount;
}

/** Record that every configured audit sink rejected a write. */
export function incrementDroppedAuditCount(): void {
  droppedAuditCount += 1;
}

/** @internal Test hook — reset the in-process dropped-audit counter. */
export function resetDroppedAuditCount(): void {
  droppedAuditCount = 0;
}
