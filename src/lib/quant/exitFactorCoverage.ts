/**
 * Factor-coverage heuristic for ExitPredictor.
 * This is not a confidence interval and must not read outcome membership.
 */

export const FACTOR_COVERAGE_FLOOR = 0.35;
export const FACTOR_COVERAGE_CEILING = 0.95;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Coverage of present positive-weight factors plus a capped peer-exit term.
 * Do not add a bonus for `isAcquired` / target membership — that was
 * post-outcome leakage (D11).
 */
export function factorCoverageScore(input: {
  presentPositiveFactorCount: number;
  similarPriorExits: number;
}): number {
  return clamp(
    FACTOR_COVERAGE_FLOOR +
      input.presentPositiveFactorCount * 0.1 +
      Math.min(input.similarPriorExits * 0.05, 0.2),
    FACTOR_COVERAGE_FLOOR,
    FACTOR_COVERAGE_CEILING,
  );
}
