/** One actionable MeshIC provenance or replay finding. */

export type MeshicDisposition = "blocking" | "gap";

export interface MeshicFinding {
  readonly disposition: MeshicDisposition;
  readonly rule: string;
  readonly location: string;
  readonly why: string;
  readonly remediation: string;
}

/** Blocking integrity failure. Strict mode exits non-zero. */
export function blockingFinding(
  rule: string,
  location: string,
  why: string,
  remediation: string,
): MeshicFinding {
  return { disposition: "blocking", rule, location, why, remediation };
}

/**
 * Non-blocking provenance gap. Reported, and not a reason to invent a date
 * or a source.
 */
export function gapFinding(
  rule: string,
  location: string,
  why: string,
  remediation: string,
): MeshicFinding {
  return { disposition: "gap", rule, location, why, remediation };
}

export function findingCount(
  findings: readonly MeshicFinding[],
  disposition: MeshicDisposition,
): number {
  return findings.filter((finding) => finding.disposition === disposition)
    .length;
}
