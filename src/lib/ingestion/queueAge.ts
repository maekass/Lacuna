/** Elapsed-time labels for review-queue SLA chips. */

const MS_PER_HOUR = 3_600_000;

/** Hours since an ISO timestamp; null when input is invalid. */
export function elapsedHoursSince(
  iso: string | null,
  nowMs = Date.now(),
): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, (nowMs - then) / MS_PER_HOUR);
}

/** Pipeline strip: "12h" or "3d" since oldest pending ingest. */
export function formatQueueSlaLabel(
  iso: string | null,
  nowMs = Date.now(),
): string | null {
  const hours = elapsedHoursSince(iso, nowMs);
  if (hours === null) return null;
  if (hours < 48) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Review console: "36h median age" or "2d median age". */
export function formatQueueMedianAgeLabel(
  hours: number | null | undefined,
): string | null {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) {
    return null;
  }
  if (hours < 48) return `${Math.round(hours)}h median age`;
  return `${Math.round(hours / 24)}d median age`;
}
