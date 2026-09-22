/**
 * Ordinal bands for the ExitPredictor factor score.
 * Cut points are documented in docs/MODEL_CARD.md.
 */

export type IndicatorBand = "Low" | "Moderate" | "High";

/** Inclusive lower bound for Moderate (factor-score units on [0, 1]). */
export const INDICATOR_BAND_MODERATE = 0.25;

/** Inclusive lower bound for High (factor-score units on [0, 1]). */
export const INDICATOR_BAND_HIGH = 0.5;

/**
 * Map a [0, 1] factor score onto a coarse band. The data resolution does
 * not support a one-decimal percentage.
 */
export function indicatorBand(score: number): IndicatorBand {
  if (score >= INDICATOR_BAND_HIGH) return "High";
  if (score >= INDICATOR_BAND_MODERATE) return "Moderate";
  return "Low";
}
