/** Reported enrollment count, or null when the registry record omits it. 0 is a real reported value. */
export function reportedEnrollment(count: unknown): number | null {
  return typeof count === "number" && Number.isFinite(count) && count >= 0
    ? count
    : null;
}

export interface EnrollmentSummary {
  /** Sum over trials that report enrollment. */
  readonly total: number;
  /** Trials with a reported count. */
  readonly reportedTrials: number;
  readonly totalTrials: number;
}

export function summarizeEnrollment(
  trials: readonly { readonly enrollment: number | null }[],
): EnrollmentSummary {
  let total = 0;
  let reportedTrials = 0;
  for (const t of trials) {
    if (t.enrollment === null) continue;
    total += t.enrollment;
    reportedTrials += 1;
  }
  return { total, reportedTrials, totalTrials: trials.length };
}
