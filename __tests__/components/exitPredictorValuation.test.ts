import { describe, expect, it } from "vitest";
import { buildPredictions } from "@/components/ExitPredictor";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import { minimalVerifiedDataset } from "../helpers/fixtures";

function valuationFactor(
  companyId: string,
  dataset: ReturnType<
    typeof buildVerifiedDerivedData
  >,
) {
  return buildPredictions(dataset)
    .find((row) => row.companyId === companyId)!
    .factorDetails.find((factor) => factor.label.startsWith("Valuation"))!;
}

describe("Exit Similarity valuation factor", () => {
  const target = minimalVerifiedDataset.companies.find((c) => c.id === "c24")!;
  const candidate = minimalVerifiedDataset.companies.find((c) =>
    c.id === "c39"
  )!;
  const deal = minimalVerifiedDataset.acquisitions[0];

  it("omits a missing valuation instead of comparing zero to a stand-in median", () => {
    const dataset = buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      companies: [
        { ...target, lastKnownValuation: 100 },
        { ...candidate, lastKnownValuation: undefined },
      ],
      acquisitions: [{
        ...deal,
        targetId: target.id,
        announcedDate: "2018-04-12",
      }],
    });
    const factor = valuationFactor(candidate.id, dataset);
    expect(factor.available).toBe(false);
    expect(factor.present).toBe(false);
  });

  it("does not let the only disclosed valuation match itself", () => {
    const dataset = buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      companies: [{ ...target, lastKnownValuation: 500 }],
      acquisitions: [{
        ...deal,
        targetId: target.id,
        announcedDate: "2018-04-12",
      }],
    });
    const factor = valuationFactor(target.id, dataset);
    expect(factor.available).toBe(false);
    expect(factor.present).toBe(false);
  });

  it("compares a disclosed valuation with other companies' precedent median", () => {
    const dataset = buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      companies: [
        { ...target, lastKnownValuation: 100 },
        { ...candidate, lastKnownValuation: 80 },
      ],
      acquisitions: [
        { ...deal, targetId: target.id, announcedDate: "2018-04-12" },
        {
          ...deal,
          id: "deal-candidate",
          targetId: candidate.id,
          announcedDate: "2019-01-15",
        },
      ],
    });
    const factor = valuationFactor(candidate.id, dataset);
    expect(factor.available).toBe(true);
    expect(factor.present).toBe(false);
  });
});
