export type PhysicianFeeSchedulePlaceOfService = "facility" | "nonfacility";

export interface PhysicianFeeSchedulePaymentInput {
  code: string;
  dataYear: number;
  locality: string;
  placeOfService: PhysicianFeeSchedulePlaceOfService;
  workRvu: number;
  practiceExpenseRvu: number;
  malpracticeRvu: number;
  workGpci: number;
  practiceExpenseGpci: number;
  malpracticeGpci: number;
  conversionFactor: number;
}

export interface PhysicianFeeSchedulePaymentResult {
  code: string;
  dataYear: number;
  locality: string;
  placeOfService: PhysicianFeeSchedulePlaceOfService;
  workComponent: number;
  practiceExpenseComponent: number;
  malpracticeComponent: number;
  geographicallyAdjustedRvu: number;
  conversionFactor: number;
  paymentUnrounded: number;
  paymentRounded: number;
}

export interface PaymentScenarioDelta {
  baseline: PhysicianFeeSchedulePaymentResult;
  comparison: PhysicianFeeSchedulePaymentResult;
  absoluteDelta: number;
  percentDelta: number | null;
}

function assertFiniteNonnegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite, nonnegative number.`);
  }
}

function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite, positive number.`);
  }
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Deterministic Medicare Physician Fee Schedule calculation primitive.
 *
 * Formula:
 * ((work RVU × work GPCI)
 *  + (practice-expense RVU × PE GPCI)
 *  + (malpractice RVU × MP GPCI))
 * × conversion factor
 *
 * This function does not fetch rates, infer missing inputs, choose a locality,
 * or decide which conversion factor applies. Those are source/ingestion
 * responsibilities. Keeping the calculator pure makes every result
 * reproducible from explicit inputs.
 */
export function calculatePhysicianFeeSchedulePayment(
  input: PhysicianFeeSchedulePaymentInput,
): PhysicianFeeSchedulePaymentResult {
  if (!input.code.trim()) throw new Error("code is required.");
  if (!Number.isInteger(input.dataYear) || input.dataYear < 2000 || input.dataYear > 2100) {
    throw new Error("dataYear must be an integer between 2000 and 2100.");
  }
  if (!input.locality.trim()) throw new Error("locality is required.");

  assertFiniteNonnegative("workRvu", input.workRvu);
  assertFiniteNonnegative("practiceExpenseRvu", input.practiceExpenseRvu);
  assertFiniteNonnegative("malpracticeRvu", input.malpracticeRvu);
  assertFinitePositive("workGpci", input.workGpci);
  assertFinitePositive("practiceExpenseGpci", input.practiceExpenseGpci);
  assertFinitePositive("malpracticeGpci", input.malpracticeGpci);
  assertFinitePositive("conversionFactor", input.conversionFactor);

  const workComponent = input.workRvu * input.workGpci;
  const practiceExpenseComponent =
    input.practiceExpenseRvu * input.practiceExpenseGpci;
  const malpracticeComponent = input.malpracticeRvu * input.malpracticeGpci;
  const geographicallyAdjustedRvu =
    workComponent + practiceExpenseComponent + malpracticeComponent;
  const paymentUnrounded = geographicallyAdjustedRvu * input.conversionFactor;

  return {
    code: input.code,
    dataYear: input.dataYear,
    locality: input.locality,
    placeOfService: input.placeOfService,
    workComponent,
    practiceExpenseComponent,
    malpracticeComponent,
    geographicallyAdjustedRvu,
    conversionFactor: input.conversionFactor,
    paymentUnrounded,
    paymentRounded: roundCurrency(paymentUnrounded),
  };
}

/**
 * Compare two explicit fee-schedule scenarios without assigning causality.
 * The caller is responsible for describing what changed between scenarios.
 */
export function comparePaymentScenarios(
  baselineInput: PhysicianFeeSchedulePaymentInput,
  comparisonInput: PhysicianFeeSchedulePaymentInput,
): PaymentScenarioDelta {
  if (baselineInput.code !== comparisonInput.code) {
    throw new Error("Payment scenarios must use the same code.");
  }
  if (baselineInput.locality !== comparisonInput.locality) {
    throw new Error("Payment scenarios must use the same locality.");
  }
  if (baselineInput.placeOfService !== comparisonInput.placeOfService) {
    throw new Error("Payment scenarios must use the same place of service.");
  }

  const baseline = calculatePhysicianFeeSchedulePayment(baselineInput);
  const comparison = calculatePhysicianFeeSchedulePayment(comparisonInput);
  const absoluteDelta = comparison.paymentUnrounded - baseline.paymentUnrounded;
  const percentDelta = baseline.paymentUnrounded === 0
    ? null
    : (absoluteDelta / baseline.paymentUnrounded) * 100;

  return {
    baseline,
    comparison,
    absoluteDelta,
    percentDelta,
  };
}
