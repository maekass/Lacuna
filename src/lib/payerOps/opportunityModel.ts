import type { SegmentData } from "@/data/payerOpsData";

/** Hours per prior-auth touch used in the opportunity simulator (CAQH-derived heuristic). */
export const AUTH_HOURS_PER_TOUCH = 0.22;

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
