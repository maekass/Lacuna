import { describe, expect, it } from "vitest";
import {
  type AcquirerProfile,
  calculateMatchScore,
  type CompanyProfile,
} from "@/data/acquirer-prediction-engine";
import { buildAcquirerProfilesFromVerified } from "@/lib/data/buildAcquirerProfilesFromVerified";
import { mapVerifiedStageToEngineStage } from "@/lib/data/companyProfileMapper";
import { missingInput, sufficient } from "@/lib/quant/estimators";
import type { EmpiricalPriors, SectorPrior } from "@/lib/quant/empiricalPriors";

describe("acquirer profile integrity", () => {
  it("does not invent a deal-size band or a stage preference", () => {
    const profiles = buildAcquirerProfilesFromVerified(
      [{ id: "a", name: "Empty", sector: "Healthcare", hq: "US" }],
      [],
      [],
    );
    expect(profiles[0]?.typicalDealSize).toBeNull();
    expect(profiles[0]?.stagePreference).toEqual([]);
  });

  it("does not read an acquisition outcome as a growth-stage preference", () => {
    expect(mapVerifiedStageToEngineStage("Acquired by Hologic (2021)")).toBe(
      "unknown",
    );
    expect(mapVerifiedStageToEngineStage("Private")).toBe("unknown");
    expect(mapVerifiedStageToEngineStage("Private (Series A)")).toBe(
      "series_a",
    );
    expect(mapVerifiedStageToEngineStage("Private (Series G)")).toBe(
      "late_stage",
    );
    expect(mapVerifiedStageToEngineStage("Pre-IPO")).toBe("late_stage");
  });

  it("omits cultural fit for unknown stages and renormalizes the overlap index", () => {
    const acquirer: AcquirerProfile = {
      id: "a",
      name: "Platform Buyer",
      type: "strategic_healthcare",
      acquisitionHistory: [],
      sectorFocus: ["fertility"],
      stagePreference: ["series_a"],
      typicalDealSize: null,
      recentActivity: "low",
      strategicPriorities: [],
      integrationStyle: "platform",
    };
    const company: CompanyProfile = {
      id: "c",
      name: "Company",
      sector: "fertility",
      stage: "unknown",
      capabilities: [],
      technology: [],
      foundingYear: null,
    };
    const unknownStage = calculateMatchScore(company, acquirer);
    const knownStage = calculateMatchScore(
      { ...company, stage: "series_a" },
      acquirer,
    );

    expect(unknownStage.culturalFit).toBeNull();
    expect(unknownStage.financialFit).toBeNull();
    expect(knownStage.culturalFit).toBe(40);
    expect(knownStage.financialFit).toBeNull();
    expect(unknownStage.matchScore).toBe(
      Math.round(
        (
          unknownStage.strategicFit * 0.35 +
          unknownStage.marketFit * 0.25
        ) / (0.35 + 0.25),
      ),
    );
    expect(knownStage.matchScore).toBe(
      Math.round(
        (
          knownStage.strategicFit * 0.35 +
          (knownStage.culturalFit ?? 0) * 0.15 +
          knownStage.marketFit * 0.25
        ) / (0.35 + 0.15 + 0.25),
      ),
    );
    expect(unknownStage.matchScore).not.toBe(knownStage.matchScore);
  });

  it("keeps funding totals in USD millions when estimating context value", () => {
    const sector: SectorPrior = {
      sector: "fertility",
      dealCount: 4,
      disclosedDealCount: 4,
      disclosedFraction: 1,
      selectionCaveat: "test",
      companyCount: 4,
      acquiredInSector: 2,
      medianDealValueEstimate: missingInput("none"),
      medianFundingMultipleEstimate: sufficient({
        value: 2,
        sampleSize: 4,
        confidenceInterval: [2, 2],
      }),
      sectorExitRateEstimate: missingInput("none"),
    };
    const priors: EmpiricalPriors = {
      overallExitRateEstimate: missingInput("none"),
      companyCount: 4,
      dealCount: 4,
      disclosedDealCount: 4,
      disclosedFraction: 1,
      selectionCaveat: "test",
      medianDealValueAllEstimate: missingInput("none"),
      medianFundingMultipleAllEstimate: missingInput("none"),
      sectorPriors: new Map([["fertility", sector]]),
      derivationNote: "test",
    };
    const company: CompanyProfile = {
      id: "c",
      name: "Co",
      sector: "fertility",
      stage: "series_b",
      capabilities: [],
      technology: [],
      fundingTotal: 20,
      foundingYear: 2016,
    };
    const acquirer: AcquirerProfile = {
      id: "a",
      name: "Buyer",
      type: "strategic_healthcare",
      acquisitionHistory: [],
      sectorFocus: ["fertility"],
      stagePreference: ["series_b"],
      typicalDealSize: { min: 10, max: 80 },
      recentActivity: "low",
      strategicPriorities: [],
      integrationStyle: "platform",
    };
    const match = calculateMatchScore(company, acquirer, priors);
    expect(match.estimatedValue?.median).toBe(40);
    expect(match.financialFit).not.toBeNull();
  });
});
