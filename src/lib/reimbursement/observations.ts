import { selectLatestVintageObservations } from "@/lib/data/cmsObservationVintage";
import type {
  CodeRateObservation,
  EconomicUnit,
  EvidenceLedger,
  ReimbursementClaim,
} from "./schema";

export interface ObservationConsistencyIssue {
  code: string;
  path: string;
  message: string;
}

const PAYMENT_UNITS = new Set<EconomicUnit>([
  "allowed_amount",
  "fee_schedule_payment",
  "reimbursement_per_hour",
  "modeled_exposure",
]);

export interface RawCmsRateObservation {
  id?: string;
  code: string;
  codeSystem: CodeRateObservation["codeSystem"];
  dataYear?: number | null;
  ruleCycle?: string;
  payer: string;
  locality?: string;
  placeOfService: string;
  workRvu?: number | null;
  practiceExpenseRvu?: number | null;
  malpracticeRvu?: number | null;
  conversionFactor?: number | null;
  paymentAmount?: number | null;
  sourceId: string;
  observedAt: string;
}

export interface NormalizedCmsObservation {
  id?: string;
  code: string;
  codeSystem: CodeRateObservation["codeSystem"];
  dataYear: number;
  payer: string;
  locality?: string;
  placeOfService: string;
  workRvu?: number;
  practiceExpenseRvu?: number;
  malpracticeRvu?: number;
  conversionFactor?: number;
  paymentAmount?: number;
  sourceId: string;
  observedAt: string;
  presentFields: string[];
  missingFields: string[];
}

export interface ObservationNormalizationIssue {
  code:
    | "missing_vintage"
    | "missing_code"
    | "missing_setting"
    | "invalid_numeric"
    | "zero_coercion_rejected"
    | "missing_source";
  message: string;
}

export type ObservationNormalizationResult =
  | { ok: true; observation: NormalizedCmsObservation }
  | { ok: false; issues: ObservationNormalizationIssue[] };

const optionalNumericFields = [
  "workRvu",
  "practiceExpenseRvu",
  "malpracticeRvu",
  "conversionFactor",
  "paymentAmount",
] as const;

function isPresentNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Normalize a vintage-aware CMS rate row without coercing missing values to zero.
 * `dataYear` is required. Null/undefined RVU or payment fields stay absent.
 */
export function normalizeCmsObservation(
  raw: RawCmsRateObservation,
): ObservationNormalizationResult {
  const issues: ObservationNormalizationIssue[] = [];

  if (!raw.code?.trim()) {
    issues.push({ code: "missing_code", message: "code is required." });
  }
  if (!raw.placeOfService?.trim()) {
    issues.push({
      code: "missing_setting",
      message: "placeOfService is required.",
    });
  }
  if (!raw.sourceId?.trim()) {
    issues.push({ code: "missing_source", message: "sourceId is required." });
  }
  if (
    raw.dataYear === null ||
    raw.dataYear === undefined ||
    !Number.isInteger(raw.dataYear)
  ) {
    issues.push({
      code: "missing_vintage",
      message: "dataYear is required and must be an integer vintage.",
    });
  } else if (raw.dataYear < 2000 || raw.dataYear > 2100) {
    issues.push({
      code: "missing_vintage",
      message: "dataYear must be between 2000 and 2100.",
    });
  }

  for (const field of optionalNumericFields) {
    const value = raw[field];
    if (value === undefined || value === null) continue;
    if (!Number.isFinite(value)) {
      issues.push({
        code: "invalid_numeric",
        message: `${field} must be a finite number when present.`,
      });
    } else if (field === "conversionFactor" && value <= 0) {
      issues.push({
        code: "invalid_numeric",
        message: "conversionFactor must be positive when present.",
      });
    } else if (value < 0) {
      issues.push({
        code: "invalid_numeric",
        message: `${field} must be nonnegative when present.`,
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const presentFields: string[] = ["code", "codeSystem", "dataYear", "payer"];
  const missingFields: string[] = [];
  const observation: NormalizedCmsObservation = {
    ...(raw.id ? { id: raw.id } : {}),
    code: raw.code.trim(),
    codeSystem: raw.codeSystem,
    dataYear: raw.dataYear as number,
    payer: raw.payer.trim(),
    ...(raw.locality?.trim() ? { locality: raw.locality.trim() } : {}),
    placeOfService: raw.placeOfService.trim(),
    sourceId: raw.sourceId,
    observedAt: raw.observedAt,
    presentFields,
    missingFields,
  };

  for (const field of optionalNumericFields) {
    const value = raw[field];
    if (isPresentNumber(value)) {
      observation[field] = value;
      presentFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  if (
    missingFields.includes("paymentAmount") &&
    missingFields.includes("workRvu") &&
    missingFields.includes("practiceExpenseRvu") &&
    missingFields.includes("malpracticeRvu")
  ) {
    missingFields.push("economic_inputs");
  }

  return { ok: true, observation };
}

/**
 * Reject the common "missing means 0 RVU / $0 payment" coercion.
 */
export function rejectMissingAsZero(
  field: string,
  value: number | null | undefined,
): ObservationNormalizationIssue | null {
  if (value === null || value === undefined) {
    return {
      code: "zero_coercion_rejected",
      message:
        `${field} is missing and must not be treated as zero. Leave it absent.`,
    };
  }
  return null;
}

export interface VintageAwareRateRow {
  code: string;
  dataYear: number;
}

/**
 * Keep one CMS vintage, then one row per code. Does not sum years.
 */
export function selectLatestVintageRates<T extends VintageAwareRateRow>(
  rows: T[],
): {
  vintage: number | null;
  rows: T[];
  droppedOlderYearCount: number;
  droppedDuplicateCodeCount: number;
} {
  const selected = selectLatestVintageObservations(
    rows.map((row) => ({ cptCode: row.code, dataYear: row.dataYear })),
  );
  if (selected.vintage === null) {
    return {
      vintage: null,
      rows: [],
      droppedOlderYearCount: 0,
      droppedDuplicateCodeCount: 0,
    };
  }

  const vintage = selected.vintage;
  const latest = rows.filter((row) => row.dataYear === vintage);
  const seen = new Set<string>();
  const out: T[] = [];
  let droppedDuplicateCodeCount = 0;
  for (const row of latest) {
    if (seen.has(row.code)) {
      droppedDuplicateCodeCount += 1;
      continue;
    }
    seen.add(row.code);
    out.push(row);
  }

  return {
    vintage,
    rows: out,
    droppedOlderYearCount: selected.droppedOlderYearCount,
    droppedDuplicateCodeCount,
  };
}

function matchingRates(
  claim: ReimbursementClaim,
  ledger: EvidenceLedger,
): CodeRateObservation[] {
  const codes = new Set(claim.codes ?? []);
  if (codes.size === 0) return [];
  return ledger.codeRates.filter((rate) =>
    codes.has(rate.code) &&
    (!claim.codeSystem || rate.codeSystem === claim.codeSystem)
  );
}

/**
 * Deterministic code / year / setting / payment-unit consistency checks.
 * Missing inputs stay missing; they are never inferred.
 */
export function validateObservationConsistency(
  ledger: EvidenceLedger,
): ObservationConsistencyIssue[] {
  const issues: ObservationConsistencyIssue[] = [];

  for (const rate of ledger.codeRates) {
    const hasRvu = [rate.workRvu, rate.practiceExpenseRvu, rate.malpracticeRvu]
      .some((value) => value !== undefined);
    const hasPayment = rate.paymentAmount !== undefined;
    if (!hasRvu && !hasPayment) {
      issues.push({
        code: "insufficient_rate_inputs",
        path: `codeRates.${rate.id}`,
        message:
          "Code-rate observation has neither RVU components nor a payment amount. Missing is not zero.",
      });
    }
    if (
      rate.paymentAmount === undefined &&
      hasRvu &&
      rate.conversionFactor === undefined
    ) {
      issues.push({
        code: "missing_conversion_factor",
        path: `codeRates.${rate.id}.conversionFactor`,
        message:
          "RVU components without a conversion factor cannot produce a fee-schedule payment.",
      });
    }
  }

  for (const claim of ledger.claims) {
    if (claim.economicUnit && PAYMENT_UNITS.has(claim.economicUnit)) {
      if (claim.dataYear === undefined) {
        issues.push({
          code: "missing_claim_vintage",
          path: `claims.${claim.id}.dataYear`,
          message:
            `${claim.economicUnit} claims require an explicit dataYear vintage.`,
        });
      }
      if (!claim.codes?.length) {
        issues.push({
          code: "missing_claim_codes",
          path: `claims.${claim.id}.codes`,
          message:
            `${claim.economicUnit} claims require explicit code identifiers.`,
        });
      }
    }

    const rates = matchingRates(claim, ledger);
    if (claim.dataYear !== undefined && rates.length > 0) {
      const mismatchedYears = rates.filter((rate) =>
        rate.dataYear !== claim.dataYear
      );
      for (const rate of mismatchedYears) {
        issues.push({
          code: "vintage_mismatch",
          path: `claims.${claim.id}.dataYear`,
          message:
            `Claim vintage ${claim.dataYear} does not match code-rate ${rate.id} vintage ${rate.dataYear}.`,
        });
      }
    }

    if (claim.placeOfService && rates.length > 0) {
      const mismatchedSetting = rates.filter((rate) =>
        rate.placeOfService !== claim.placeOfService
      );
      for (const rate of mismatchedSetting) {
        issues.push({
          code: "setting_mismatch",
          path: `claims.${claim.id}.placeOfService`,
          message:
            `Claim setting ${claim.placeOfService} does not match code-rate ${rate.id} setting ${rate.placeOfService}.`,
        });
      }
    }

    if (
      claim.economicUnit === "fee_schedule_payment" &&
      rates.length > 0 &&
      rates.every((rate) =>
        rate.paymentAmount === undefined &&
        rate.conversionFactor === undefined
      )
    ) {
      issues.push({
        code: "payment_unit_mismatch",
        path: `claims.${claim.id}.economicUnit`,
        message:
          "fee_schedule_payment claims require a payment amount or RVU × conversion-factor inputs.",
      });
    }

    if (
      claim.economicUnit === "rvu" &&
      rates.length > 0 &&
      rates.every((rate) =>
        rate.workRvu === undefined &&
        rate.practiceExpenseRvu === undefined &&
        rate.malpracticeRvu === undefined
      )
    ) {
      issues.push({
        code: "payment_unit_mismatch",
        path: `claims.${claim.id}.economicUnit`,
        message:
          "rvu claims require at least one RVU component on a matching code-rate.",
      });
    }
  }

  return issues;
}
