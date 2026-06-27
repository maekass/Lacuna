import type {
  AcquirerProfile,
  HistoricalAcquisition,
} from "@/data/acquirer-prediction-engine";
import {
  mapVerifiedSectorToEngineSector,
  mapVerifiedStageToEngineStage,
} from "@/lib/data/companyProfileMapper";
import type {
  VerifiedAcquisitionView,
  VerifiedAcquirerView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";
import { normalizeSectorBucket } from "@/lib/quant/empiricalPriors";

function inferAcquirerType(
  acquirer: VerifiedAcquirerView,
): AcquirerProfile["type"] {
  const sector = (acquirer.sector ?? "").toLowerCase();
  if (sector.includes("pharma") || sector.includes("therapeutic")) {
    return "pharma";
  }
  if (sector.includes("insur") || acquirer.name.toLowerCase().includes("health")) {
    return "insurer";
  }
  if (acquirer.ticker) return "strategic_healthcare";
  return "strategic_healthcare";
}

function recentActivityFromDate(
  isoDate: string | undefined,
): AcquirerProfile["recentActivity"] {
  if (!isoDate) return "low";
  const yearsAgo = (Date.now() - new Date(isoDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  if (yearsAgo <= 2) return "high";
  if (yearsAgo <= 5) return "medium";
  return "low";
}

function dealSizeRange(
  disclosedValues: number[],
): { min: number; max: number } {
  if (disclosedValues.length === 0) {
    return { min: 10, max: 500 };
  }
  const sorted = [...disclosedValues].sort((a, b) => a - b);
  return {
    min: Math.max(1, Math.round(sorted[0] * 0.5)),
    max: Math.round(sorted[sorted.length - 1] * 1.5),
  };
}

/**
 * Build acquirer profiles from verified acquirers + deal history.
 * Replaces the static STRATEGIC_ACQUIRERS panel with dataset-derived profiles.
 */
export function buildAcquirerProfilesFromVerified(
  acquirers: readonly VerifiedAcquirerView[],
  acquisitions: readonly VerifiedAcquisitionView[],
  companies: readonly VerifiedCompanyView[],
): AcquirerProfile[] {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const dealsByAcquirer = new Map<string, VerifiedAcquisitionView[]>();

  for (const deal of acquisitions) {
    const list = dealsByAcquirer.get(deal.acquirerId) ?? [];
    list.push(deal);
    dealsByAcquirer.set(deal.acquirerId, list);
  }

  return acquirers.map((acquirer) => {
    const deals = dealsByAcquirer.get(acquirer.id) ?? [];
    const disclosedValues = deals
      .map((d) => d.dealValue)
      .filter((v): v is number => typeof v === "number" && v > 0);

    const acquisitionHistory: HistoricalAcquisition[] = deals.map((deal) => {
      const target = companyById.get(deal.targetId);
      return {
        targetName: deal.targetName,
        targetSector: mapVerifiedSectorToEngineSector(
          target?.sector ?? acquirer.sector,
        ),
        dealValue: deal.dealValue ?? 0,
        dealDate: deal.announcedDate.slice(0, 7),
        stageAtAcquisition: target
          ? mapVerifiedStageToEngineStage(target.stage)
          : "growth",
        strategicRationale: deal.strategicRationale,
      };
    });

    const sectorFocus = [
      ...new Set(
        deals.flatMap((deal) => {
          const target = companyById.get(deal.targetId);
          return target
            ? [mapVerifiedSectorToEngineSector(target.sector)]
            : [];
        }),
      ),
    ];
    if (sectorFocus.length === 0) {
      sectorFocus.push(
        mapVerifiedSectorToEngineSector(acquirer.sector ?? "digital health"),
      );
    }

    const stagePreference = [
      ...new Set(
        deals.flatMap((deal) => {
          const target = companyById.get(deal.targetId);
          return target
            ? [mapVerifiedStageToEngineStage(target.stage)]
            : [];
        }),
      ),
    ];
    if (stagePreference.length === 0) {
      stagePreference.push("series_b", "growth");
    }

    const mostRecentDate = deals.length > 0
      ? [...deals].sort((a, b) =>
        new Date(b.announcedDate).getTime() -
          new Date(a.announcedDate).getTime()
      )[0].announcedDate
      : undefined;

    const strategicPriorities = [
      ...new Set(
        deals
          .map((d) => normalizeSectorBucket(
            companyById.get(d.targetId)?.sector ?? acquirer.sector ?? "other",
          ))
          .filter(Boolean),
      ),
    ].map((bucket) => bucket.replace(/_/g, " "));

    return {
      id: acquirer.id,
      name: acquirer.name,
      type: inferAcquirerType(acquirer),
      acquisitionHistory,
      sectorFocus,
      stagePreference,
      typicalDealSize: dealSizeRange(disclosedValues),
      recentActivity: recentActivityFromDate(mostRecentDate),
      strategicPriorities: strategicPriorities.length > 0
        ? strategicPriorities
        : [acquirer.sector ?? "healthcare"],
      integrationStyle: "platform",
    };
  });
}
