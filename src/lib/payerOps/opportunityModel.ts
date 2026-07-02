import type { SegmentData } from "@/data/payerOpsData";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

/** Hours per prior-auth touch used in the opportunity simulator (CAQH-derived heuristic). */
export const AUTH_HOURS_PER_TOUCH = 0.22;

export const OPPORTUNITY_METRIC_MODELS = {
  coveredLives: {
    module: "src/data/payerOpsData.ts",
    exportName: "segments",
    definition:
      "Hypothetical covered lives from plan-configurable segment defaults — swap for real membership.",
  },
  avoidableDenials: {
    module: "src/lib/payerOps/opportunityModel.ts",
    exportName: "computeModeled",
    definition:
      "Monthly avoidable denials = claims × (denialRate/100) × (avoidableRate/100).",
  },
  monthlySavings: {
    module: "src/lib/payerOps/opportunityModel.ts",
    exportName: "computeModeled",
    definition:
      "Monthly admin savings = avoidableDenials × adminCost ($ per touch).",
  },
  authHours: {
    module: "src/lib/payerOps/opportunityModel.ts",
    exportName: "computeModeled",
    definition:
      "Auth review hours freed = auths × AUTH_HOURS_PER_TOUCH (0.22 h, CAQH heuristic).",
  },
} as const satisfies Record<string, ModelProvenance>;

export interface ModeledOpportunity {
  avoidableDenials: number;
  monthlySavings: number;
  authHours: number;
}

/**
 * Opportunity simulator core model.
 * avoidable denials = claims × denial rate × avoidable fraction;
 * admin savings = avoidable denials × admin cost per touch;
 * auth hours = auths × {@link AUTH_HOURS_PER_TOUCH}.
 */
export function computeModeled(
  segmentData: Pick<SegmentData, "claims" | "auths" | "adminCost">,
  denialRate: number,
  avoidableRate: number,
): ModeledOpportunity {
  const avoidableDenials = Math.round(
    segmentData.claims * (denialRate / 100) * (avoidableRate / 100),
  );
  const monthlySavings = Math.round(avoidableDenials * segmentData.adminCost);
  const authHours = Math.round(segmentData.auths * AUTH_HOURS_PER_TOUCH);
  return { avoidableDenials, monthlySavings, authHours };
}

export const OPPORTUNITY_MODEL_FOOTNOTE =
  "Derived · src/lib/payerOps/opportunityModel.ts · segment inputs are plan-configurable defaults; denial and avoidable-rate sliders use published industry benchmarks (CAQH, KFF).";
