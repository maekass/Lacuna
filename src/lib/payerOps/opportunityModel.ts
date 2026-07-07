import type { SegmentData } from "@/data/payerOpsData";
import {
  CAQH_2023_PRIOR_AUTH,
  PAYER_OPS_BENCHMARK_RETRIEVED_AT,
} from "@/data/payerOpsBenchmarks";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

/**
 * Auditable constants for the payer ops opportunity simulator.
 * Values grounded in {@link CAQH_2023_PRIOR_AUTH} and segment bindings in payerOpsBenchmarks.ts.
 */
export const MODEL_ASSUMPTIONS = {
  /** CAQH 2023 Index: average provider minutes per electronic prior-auth touch → hours. */
  authHoursPerTouch: CAQH_2023_PRIOR_AUTH.providerMinutesElectronic.value / 60,
  /** Plan-input convention: denial and avoidable rates are whole-number percents (0–100). */
  percentScale: 100,
  /** CAQH 2023 Index: plan labor cost per manual prior-auth transaction ($). */
  adminCostFloor: CAQH_2023_PRIOR_AUTH.payerCostManual.value,
} as const;

/**
 * Resolve $/touch admin cost for savings math.
 * Falls back to {@link MODEL_ASSUMPTIONS.adminCostFloor} when plan input is missing or non-positive.
 */
export function resolveAdminCostPerTouch(adminCost: number): number {
  const { adminCostFloor } = MODEL_ASSUMPTIONS;
  return Number.isFinite(adminCost) && adminCost > 0
    ? adminCost
    : adminCostFloor;
}

export const OPPORTUNITY_METRIC_MODELS = {
  coveredLives: {
    module: "src/data/payerOpsData.ts",
    exportName: "segments",
    definition:
      "Covered lives from plan-configurable segment defaults in payerOpsData.ts — swap for real membership.",
  },
  avoidableDenials: {
    module: "src/lib/payerOps/opportunityModel.ts",
    exportName: "computeModeled",
    definition:
      `Monthly avoidable denials = claims × (denialRate/${MODEL_ASSUMPTIONS.percentScale}) × (avoidableRate/${MODEL_ASSUMPTIONS.percentScale}).`,
  },
  monthlySavings: {
    module: "src/lib/payerOps/opportunityModel.ts",
    exportName: "computeModeled",
    definition:
      `Monthly admin savings = avoidableDenials × adminCost ($ per touch; CAQH floor $${MODEL_ASSUMPTIONS.adminCostFloor} when unset).`,
  },
  authHours: {
    module: "src/lib/payerOps/opportunityModel.ts",
    exportName: "computeModeled",
    definition:
      `Auth review hours freed = auths × authHoursPerTouch (${CAQH_2023_PRIOR_AUTH.providerMinutesElectronic.value} min/touch, CAQH 2023 Index).`,
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
 * admin savings = avoidable denials × admin cost per touch (CAQH floor when unset);
 * auth hours = auths × {@link MODEL_ASSUMPTIONS.authHoursPerTouch}.
 */
export function computeModeled(
  segmentData: Pick<SegmentData, "claims" | "auths" | "adminCost">,
  denialRate: number,
  avoidableRate: number,
): ModeledOpportunity {
  const { percentScale, authHoursPerTouch } = MODEL_ASSUMPTIONS;
  const adminCostPerTouch = resolveAdminCostPerTouch(segmentData.adminCost);
  const avoidableDenials = Math.round(
    segmentData.claims *
      (denialRate / percentScale) *
      (avoidableRate / percentScale),
  );
  const monthlySavings = Math.round(avoidableDenials * adminCostPerTouch);
  const authHours = Math.round(segmentData.auths * authHoursPerTouch);
  return { avoidableDenials, monthlySavings, authHours };
}

export const OPPORTUNITY_MODEL_FOOTNOTE =
  `Derived · src/lib/payerOps/opportunityModel.ts · segment denial/avoidable/admin defaults from src/data/payerOpsBenchmarks.ts (CAQH, KFF, Mass HPC, HHS OIG, retrieved ${PAYER_OPS_BENCHMARK_RETRIEVED_AT}). Auth labor: ${CAQH_2023_PRIOR_AUTH.providerMinutesElectronic.value} min/touch; admin cost floor: $${MODEL_ASSUMPTIONS.adminCostFloor}/touch (CAQH 2023 Index, plan manual).`;
