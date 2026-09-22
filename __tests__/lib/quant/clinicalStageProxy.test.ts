import { describe, expect, it } from "vitest";
import { deriveEmpiricalPriors } from "@/lib/quant/empiricalPriors";
import {
  adaptQuantCompany,
  proxyClinicalStage,
  stripAcquisitionOutcomeLabel,
} from "@/lib/quant/adaptQuantCompany";
import { AcquisitionPredictor, isSufficient } from "@/lib/quant/quantEngine";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

function view(
  overrides: Partial<VerifiedCompanyView> & Pick<VerifiedCompanyView, "stage">,
): VerifiedCompanyView {
  return {
    id: "c1",
    name: "TestCo",
    sector: "Fertility",
    founded: 2017,
    foundedPrecision: "year",
    catalogEntryReason: "deal-list",
    catalogEntryDate: null,
    outcomeType: "acquired",
    hq: "San Francisco, CA",
    description: "Test",
    sources: [],
    ...overrides,
  };
}

describe("proxyClinicalStage", () => {
  it("does not treat an acquisition outcome as FDA approved", () => {
    expect(stripAcquisitionOutcomeLabel("Acquired by Ro (2021)")).toBe("");
    expect(proxyClinicalStage("Acquired by Ro (2021)")).toBeNull();
    expect(proxyClinicalStage("Acquired by Hologic (2024)")).toBeNull();
  });

  it("still proxies a pre-outcome funding stage", () => {
    expect(proxyClinicalStage("Private (Series B)")).toBe("phase3");
    expect(proxyClinicalStage("Private (Seed)")).toBe("preclinical");
    expect(proxyClinicalStage("Public (SPAC 2021)")).toBe("fda_approved");
  });
});

describe("adaptQuantCompany leakage", () => {
  it("withholds clinicalStage when the catalog stage is only an outcome", () => {
    const adapted = adaptQuantCompany(
      view({
        name: "Modern Fertility",
        stage: "Acquired by Ro (2021)",
        lastKnownValuation: 225,
        totalFunding: 155,
      }),
    );
    expect(adapted.company.clinicalStage).toBeUndefined();
    expect(adapted.proxiedFields).toContain(
      "clinical stage withheld — catalog stage is an acquisition outcome",
    );
  });

  it("withholds the similarity index when clinical stage is an outcome label", () => {
    const company = adaptQuantCompany(
      view({
        id: "target",
        stage: "Acquired by Ro (2021)",
        totalFunding: 155,
      }),
    ).company;
    const peers = [
      view({
        id: "peer",
        name: "Peer",
        stage: "Private (Series B)",
        outcomeType: "unknown",
      }),
    ];
    const deals = [{
      id: "deal1",
      targetId: "target",
      acquirerId: "a1",
      targetName: "TestCo",
      acquirerName: "Ro",
      announcedDate: "2021-01-01",
      dealType: "acquisition",
      strategicRationale: "",
      source: "test",
    }];
    const predictor = new AcquisitionPredictor(
      deriveEmpiricalPriors([
        view({
          id: "target",
          stage: "Acquired by Ro (2021)",
          totalFunding: 155,
        }),
        ...peers,
      ], deals),
    );
    const result = predictor.predictAcquisition(company);
    expect(isSufficient(result.probability)).toBe(false);
    if (!isSufficient(result.probability)) {
      expect(result.probability.message).toMatch(/outcome labels/i);
    }
  });
});
