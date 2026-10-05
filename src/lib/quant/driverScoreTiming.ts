/**
 * Diagnostic for driver-score feature timing.
 *
 * This does not change scores, weights, labels, or the acquisition index.
 * A row is flagged only when the one dated live input — `totalFunding`,
 * read as `raisedToDate` — has its own `publicAsOfDate` after the
 * caller-supplied cutoff. The other four drivers have no feature timestamp
 * in this repository. An unflagged row is not a no-leakage result.
 */

import { isCalendarDay } from "@/lib/data/pointInTime";

export const DRIVER_KEYS = [
  "clinicalValidation",
  "marketTiming",
  "teamQuality",
  "strategicFit",
  "geographicArbitrage",
] as const;

export type DriverKey = (typeof DRIVER_KEYS)[number];

export type DriverTimingStatus =
  | "after-cutoff"
  | "not-after-cutoff"
  | "missing-timestamp"
  | "invalid-date"
  | "feature-absent"
  | "no-dated-field";

/** Shown on every report so a false flag cannot be read as clearance. */
export const DRIVER_TIMING_LIMIT =
  "This flag means a stored feature day is after the cutoff. It does not certify the absence of leakage.";

export interface DriverTimingInput {
  /** Intended score date, `YYYY-MM-DD`. This module does not infer one. */
  cutoff: string;
  /**
   * Funding total the market-timing scorer would read, in USD millions.
   * Omit it when `adaptQuantCompany` leaves `raisedToDate` unset.
   */
  raisedToDate?: number;
  /** `publicAsOfDate` on the current `totalFunding` evidence row. */
  fundingPublicAsOfDate?: string | null;
  /** Echoed onto the finding. It does not change the flag. */
  fundingDatePrecision?: string | null;
}

export interface DriverTimingFinding {
  driver: DriverKey;
  status: DriverTimingStatus;
  field: "totalFunding" | null;
  asOf: string | null;
  datePrecision: string | null;
  cutoff: string;
}

export interface DriverTimingReport {
  readonly findings: readonly DriverTimingFinding[];
  /** True only when a feature timestamp is later than `cutoff`. */
  readonly flagged: boolean;
  readonly limit: typeof DRIVER_TIMING_LIMIT;
}

function marketTimingStatus(input: DriverTimingInput): DriverTimingStatus {
  if (
    typeof input.raisedToDate !== "number" ||
    !Number.isFinite(input.raisedToDate)
  ) {
    return "feature-absent";
  }
  if (!isCalendarDay(input.cutoff)) return "invalid-date";
  const asOf = input.fundingPublicAsOfDate;
  if (asOf == null || asOf.trim() === "") return "missing-timestamp";
  if (!isCalendarDay(asOf)) return "invalid-date";
  return asOf > input.cutoff ? "after-cutoff" : "not-after-cutoff";
}

/**
 * Compare driver inputs to a score cutoff.
 *
 * Deal announcement dates are not read. Passing `announcedDate` as
 * `fundingPublicAsOfDate` would be a caller error: that event date is not
 * the funding figure's vintage.
 */
export function diagnoseDriverScoreTiming(
  input: DriverTimingInput,
): DriverTimingReport {
  const marketStatus = marketTimingStatus(input);
  const findings: DriverTimingFinding[] = DRIVER_KEYS.map((driver) => {
    if (driver !== "marketTiming") {
      return {
        driver,
        status: "no-dated-field",
        field: null,
        asOf: null,
        datePrecision: null,
        cutoff: input.cutoff,
      };
    }
    return {
      driver,
      status: marketStatus,
      field: "totalFunding",
      asOf: input.fundingPublicAsOfDate ?? null,
      datePrecision: input.fundingDatePrecision ?? null,
      cutoff: input.cutoff,
    };
  });

  return {
    findings,
    flagged: findings.some((finding) => finding.status === "after-cutoff"),
    limit: DRIVER_TIMING_LIMIT,
  };
}
