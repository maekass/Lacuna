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
  workGpci?: number | null;
  practiceExpenseGpci?: number | null;
  malpracticeGpci?: number | null;
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
  ruleCycle?: string;
  payer: string;
  locality?: string;
  placeOfService: string;
  workRvu?: number;
  practiceExpenseRvu?: number;
  malpracticeRvu?: number;
  workGpci?: number;
  practiceExpenseGpci?: number;
  malpracticeGpci?: number;
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
  "workGpci",
  "practiceExpenseGpci",
  "malpracticeGpci",
  "conversionFactor",
  "paymentAmount",
] as const;

const POSITIVE_OPTIONAL_FIELDS = new Set<
  (typeof optionalNumericFields)[number]
>([
  "workGpci",
  "practiceExpenseGpci",
  "malpracticeGpci",
  "conversionFactor",
]);

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
    } else if (POSITIVE_OPTIONAL_FIELDS.has(field) && value <= 0) {
      issues.push({
        code: "invalid_numeric",
        message: `${field} must be positive when present.`,
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
    ...(raw.ruleCycle?.trim() ? { ruleCycle: raw.ruleCycle.trim() } : {}),
    ...(raw.locality?.trim() ? { locality: raw.locality.trim() } : {}),
    placeOfService: raw.placeOfService.trim(),
    sourceId: raw.sourceId,
    observedAt: raw.observedAt,
    presentFields,
    missingFields,
  };

  if (observation.ruleCycle) presentFields.push("ruleCycle");
  if (observation.locality) presentFields.push("locality");

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

/**
 * Rates that share every identifying dimension the claim actually states.
 * Unrelated vintages, payers, or settings stay out of the applicable set.
 */
export function matchingRates(
  claim: ReimbursementClaim,
  ledger: EvidenceLedger,
): CodeRateObservation[] {
  const codes = new Set(claim.codes ?? []);
  if (codes.size === 0) return [];
  return ledger.codeRates.filter((rate) => {
    if (!codes.has(rate.code)) return false;
    if (claim.codeSystem && rate.codeSystem !== claim.codeSystem) return false;
    if (claim.payer && rate.payer !== claim.payer) return false;
    if (claim.dataYear !== undefined && rate.dataYear !== claim.dataYear) {
      return false;
    }
    if (
      claim.placeOfService && rate.placeOfService !== claim.placeOfService
    ) {
      return false;
    }
    if (claim.locality && rate.locality !== claim.locality) return false;
    if (!claim.sourceIds.includes(rate.sourceId)) return false;
    return true;
  });
}

/**
 * A fee-schedule claim is reproducible only from a sourced payment amount or
 * the complete RVU × GPCI × conversion-factor set. Missing GPCIs are not 1.0.
 */
export function rateSupportsFeeSchedulePayment(
  rate: CodeRateObservation,
): boolean {
  if (rate.paymentAmount !== undefined) return true;
  return (
    rate.workRvu !== undefined &&
    rate.practiceExpenseRvu !== undefined &&
    rate.malpracticeRvu !== undefined &&
    rate.workGpci !== undefined &&
    rate.practiceExpenseGpci !== undefined &&
    rate.malpracticeGpci !== undefined &&
    rate.conversionFactor !== undefined
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
      if (!claim.payer) {
        issues.push({
          code: "missing_claim_payer",
          path: `claims.${claim.id}.payer`,
          message: `${claim.economicUnit} claims require an explicit payer.`,
        });
      }
      if (!claim.placeOfService) {
        issues.push({
          code: "missing_claim_setting",
          path: `claims.${claim.id}.placeOfService`,
          message:
            `${claim.economicUnit} claims require an explicit place of service.`,
        });
      }
    }

    if (claim.economicUnit === "fee_schedule_payment" && !claim.locality) {
      issues.push({
        code: "missing_claim_locality",
        path: `claims.${claim.id}.locality`,
        message:
          "fee_schedule_payment claims require an explicit locality. National rows use locality 00; missing is not national.",
      });
    }

    const rates = matchingRates(claim, ledger);
    const needsApplicableRate = Boolean(
      claim.economicUnit && PAYMENT_UNITS.has(claim.economicUnit) &&
        claim.codes?.length,
    );
    if (needsApplicableRate && rates.length === 0) {
      issues.push({
        code: "no_applicable_rate",
        path: `claims.${claim.id}`,
        message:
          "No code-rate observation matches this claim's cited source, code, payer, vintage, locality, and setting. Unrelated rows are not alternatives.",
      });
    }

    if (
      claim.economicUnit === "fee_schedule_payment" &&
      rates.length > 0 &&
      !rates.some(rateSupportsFeeSchedulePayment)
    ) {
      issues.push({
        code: "payment_unit_mismatch",
        path: `claims.${claim.id}.economicUnit`,
        message:
          "fee_schedule_payment claims require a matching rate with paymentAmount or complete work/PE/MP RVU, GPCI, and conversion-factor inputs. Missing GPCIs are not 1.0.",
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
