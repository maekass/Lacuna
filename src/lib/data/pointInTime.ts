/** A field is usable in a dated replay only when its own vintage and source are known. */
export interface DatedEvidence<T> {
  value: T;
  asOf: string | null | undefined;
  source: string | null | undefined;
}

export type PointInTimeResult<T> =
  | { eligible: true; value: T }
  | {
    eligible: false;
    reason: "missing-provenance" | "invalid-date" | "after-cutoff";
  };

function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

/** Gate a *field*, not a row: event dates never substitute for value vintage. */
export function atDecisionDate<T>(
  evidence: DatedEvidence<T>,
  cutoff: string,
): PointInTimeResult<T> {
  if (!evidence.asOf || !evidence.source?.trim()) {
    return { eligible: false, reason: "missing-provenance" };
  }
  if (!validDay(cutoff) || !validDay(evidence.asOf)) {
    return { eligible: false, reason: "invalid-date" };
  }
  if (evidence.asOf > cutoff) {
    return { eligible: false, reason: "after-cutoff" };
  }
  return { eligible: true, value: evidence.value };
}
