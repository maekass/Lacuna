/**
 * Explicit, testable exceptions for the MeshIC claim-language scan.
 * A match is allowed only when the file still contains `contains`.
 * Negations ("not a forecast") are handled separately and are not listed here.
 */
export interface MeshicClaimException {
  readonly fileSuffix: string;
  readonly contains: string;
  readonly reason: string;
}

export const MESHIC_CLAIM_EXCEPTIONS: readonly MeshicClaimException[] = [
  {
    fileSuffix: "src/components/FairnessLimitations.tsx",
    contains: "Equal positive prediction rates across groups",
    reason:
      "Fairness definition for a bounded statistical parity check, not an exit forecast.",
  },
  {
    fileSuffix: "src/components/FairnessLimitations.tsx",
    contains: "Inverse probability weighting for selection",
    reason:
      "Names a causal-inference method. It is not an acquisition probability.",
  },
  {
    fileSuffix: "src/components/FairnessLimitations.tsx",
    contains: "Equalized Odds",
    reason: "Equalized odds is a fairness criterion, not an exit-odds claim.",
  },
  {
    fileSuffix: "src/components/FairnessLimitations.tsx",
    contains: "Predictions mean the same thing across groups",
    reason:
      "Calibration wording for a bounded fairness definition, not an exit forecast.",
  },
  {
    fileSuffix: "src/components/WomensHealthExitsContext.tsx",
    contains: "return forecasts",
    reason:
      "Listed as a prohibited use of the research card, not a product claim.",
  },
  {
    fileSuffix: "src/components/WomensHealthExitsContext.tsx",
    contains: "predictive model inputs",
    reason:
      "Listed as a prohibited use of the research card, not a product claim.",
  },
];
