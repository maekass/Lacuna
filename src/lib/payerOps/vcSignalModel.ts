import {
  type VcMomentum,
  type VcSignalDealExample,
  vcSignals,
  vcSignalSectorMap,
} from "@/data/payerOpsData";
import type { VerifiedAcquisitionView } from "@/lib/data/verifiedDataHelpers";

const RECENT_DEAL_YEARS = 3;
const MAX_EXAMPLES = 2;

function isRecentDeal(announcedDate: string, asOfYear: number): boolean {
  const year = Number(announcedDate.slice(0, 4));
  return Number.isFinite(year) && year >= asOfYear - RECENT_DEAL_YEARS;
}

/**
 * Classifies M&A momentum from verified deal velocity in the Lacuna dataset.
 * early: ≤2 deals or no recent activity · accelerating: recent cluster · stable: otherwise.
 */
export function deriveVcMomentum(
  deals: VerifiedAcquisitionView[],
  asOfYear = new Date().getFullYear(),
): VcMomentum {
  if (deals.length === 0) return "early";

  const recentCount =
    deals.filter((deal) => isRecentDeal(deal.announcedDate, asOfYear)).length;

  if (deals.length <= 2) {
    return recentCount >= 1 ? "accelerating" : "early";
  }
  if (recentCount >= 2 || recentCount / deals.length >= 0.4) {
    return "accelerating";
  }
  return "stable";
}

export interface VcSignalDealFlow {
  count: number;
  examples: VcSignalDealExample[];
  momentum: VcMomentum;
  sectors: readonly string[];
}

export interface VcSignalDealFlowResult {
  counts: Record<string, number>;
  examples: Record<string, VcSignalDealExample[]>;
  momentum: Record<string, VcMomentum>;
  byPainPoint: Record<string, VcSignalDealFlow>;
}

/**
 * Maps each VC signal pain point to verified acquisitions whose target sector
 * matches {@link vcSignalSectorMap}, then derives counts, examples, and momentum.
 */
export function computeVcSignalDealFlow(
  verifiedAcquisitions: VerifiedAcquisitionView[],
  companySectorById: Map<string, string>,
): VcSignalDealFlowResult {
  const counts: Record<string, number> = {};
  const examples: Record<string, VcSignalDealExample[]> = {};
  const momentum: Record<string, VcMomentum> = {};
  const byPainPoint: Record<string, VcSignalDealFlow> = {};

  for (const signal of vcSignals) {
    const sectors = vcSignalSectorMap[signal.painPoint] ?? [];
    const sectorSet = new Set(sectors);
    const matches = verifiedAcquisitions.filter((acquisition) => {
      const sector = companySectorById.get(acquisition.targetId);
      return sector !== undefined && sectorSet.has(sector);
    });

    const dealExamples = matches
      .sort((a, b) => b.announcedDate.localeCompare(a.announcedDate))
      .slice(0, MAX_EXAMPLES)
      .map((acquisition) => ({
        targetName: acquisition.targetName,
        acquirerName: acquisition.acquirerName,
        year: Number(acquisition.announcedDate.slice(0, 4)),
      }));

    const flow: VcSignalDealFlow = {
      count: matches.length,
      examples: dealExamples,
      momentum: deriveVcMomentum(matches),
      sectors,
    };

    counts[signal.painPoint] = flow.count;
    examples[signal.painPoint] = flow.examples;
    momentum[signal.painPoint] = flow.momentum;
    byPainPoint[signal.painPoint] = flow;
  }

  return { counts, examples, momentum, byPainPoint };
}

export const VC_SIGNAL_MODEL_FOOTNOTE =
  "Derived · src/lib/payerOps/vcSignalModel.ts · deal counts and examples from dataset.verified.json via sector map; momentum from verified deal dates.";
