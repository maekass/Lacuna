import { describe, expect, it } from "vitest";
import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";
import { deriveEmpiricalPriors } from "@/lib/quant/empiricalPriors";
import { indexExitRate } from "@/lib/quant/leaveOneOutExitRate";
import {
  AcquisitionPredictor,
  isSufficient,
  numericOrNull,
  type QuantCompany,
} from "@/lib/quant/quantEngine";

function company(
  overrides: Partial<VerifiedCompanyView> = {},
): VerifiedCompanyView {
  return {
    id: "c1",
    name: "TestCo",
    sector: "Diagnostics",
    stage: "Series B",
    founded: 2015,
    hq: "Boston, MA",
    description: "Test diagnostics company",
    totalFunding: 50,
    sources: [],
    foundedPrecision: "year",
    catalogEntryReason: "unknown",
    catalogEntryDate: null,
    outcomeType: "unknown",
    ...overrides,
  };
}

function deal(
  overrides: Partial<VerifiedAcquisitionView> = {},
): VerifiedAcquisitionView {
  return {
    id: "d1",
    targetId: "c1",
    acquirerId: "a1",
    targetName: "TestCo",
    acquirerName: "BigCo",
    announcedDate: "2022-06-15",
    dealValue: 400,
    dealType: "acquisition",
    strategicRationale: "test",
    source: "SEC EDGAR",
    ...overrides,
  };
}

function quant(id: string, sector = "Diagnostics"): QuantCompany {
  return {
    id,
    name: id,
    sector,
    fundingStage: "Series B",
    clinicalStage: "phase3",
    raisedToDate: 30,
    customerCount: 0,
    geographicFocus: ["US"],
    condition: "pcos",
  };
}

describe("indexExitRate", () => {
  const companies = Array.from({ length: 6 }, (_, i) =>
    company({
      id: `c${i + 1}`,
      stage: i < 2 ? "Acquired by BigCo (2021)" : "Series B",
    }));
  const deals = [
    deal({ id: "d1", targetId: "c1" }),
    deal({ id: "d2", targetId: "c2" }),
  ];
  const priors = deriveEmpiricalPriors(companies, deals);

  it("keeps the in-sample catalog share at acquired/companies", () => {
    expect(priors.acquiredCompanyCount).toBe(2);
    expect(priors.catalogCompanyIds?.size).toBe(6);
    expect(priors.overallExitRateEstimate).toMatchObject({
      kind: "sufficient",
      value: 2 / 6,
      sampleSize: 6,
    });
  });

  it("removes an acquired catalog company from the sector share", () => {
    const rate = indexExitRate(priors, { id: "c1", sector: "Diagnostics" });
    expect(rate.basis).toBe("leave_one_out");
    expect(rate.rate).toMatchObject({
      kind: "sufficient",
      value: 1 / 5,
      sampleSize: 5,
    });
  });

  it("removes a non-acquired catalog company from the denominator only", () => {
    const rate = indexExitRate(priors, { id: "c3", sector: "Diagnostics" });
    expect(rate.basis).toBe("leave_one_out");
    expect(rate.rate).toMatchObject({
      kind: "sufficient",
      value: 2 / 5,
      sampleSize: 5,
    });
  });

  it("labels the in-sample share when the company is outside the catalog", () => {
    const rate = indexExitRate(priors, {
      id: "outside",
      sector: "Diagnostics",
    });
    expect(rate.basis).toBe("in_sample");
    expect(rate.inSampleReason).toBe("outside_catalog");
    expect(rate.rate).toMatchObject({
      kind: "sufficient",
      value: 2 / 6,
      sampleSize: 6,
    });
  });

  it("does not substitute the in-sample sector share when leave-one-out drops below the minimum", () => {
    const diagnostics = Array.from({ length: 5 }, (_, i) =>
      company({
        id: `d${i + 1}`,
        stage: "Acquired by BigCo (2021)",
      }));
    const fertility = Array.from({ length: 5 }, (_, i) =>
      company({
        id: `f${i + 1}`,
        sector: "Fertility",
        stage: "Series A",
      }));
    const mixed = deriveEmpiricalPriors(
      [...diagnostics, ...fertility],
      diagnostics.map((row, i) =>
        deal({ id: `deal-${i}`, targetId: row.id, dealValue: 100 + i })
      ),
    );
    const sector = indexExitRate(mixed, { id: "d1", sector: "Diagnostics" });
    expect(sector.basis).toBe("leave_one_out");
    expect(sector.rate).toMatchObject({
      kind: "sufficient",
      value: 4 / 9,
      sampleSize: 9,
    });
  });
});

describe("AcquisitionPredictor leave-one-out base rate", () => {
  const companies = Array.from({ length: 6 }, (_, i) =>
    company({
      id: `c${i + 1}`,
      stage: i < 2 ? "Acquired by BigCo (2021)" : "Series B",
    }));
  const deals = [
    deal({ id: "d1", targetId: "c1" }),
    deal({ id: "d2", targetId: "c2" }),
  ];
  const priors = deriveEmpiricalPriors(companies, deals);
  const predictor = new AcquisitionPredictor(priors);

  it("scales the index by the leave-one-out share", () => {
    const acquired = numericOrNull(
      predictor.predictAcquisition(quant("c1")).probability,
    );
    const peer = numericOrNull(
      predictor.predictAcquisition(quant("c3")).probability,
    );
    expect(acquired).not.toBeNull();
    expect(peer).not.toBeNull();
    expect(acquired! / peer!).toBeCloseTo(0.5, 8);
  });

  it("labels leave-one-out and the separate in-sample share", () => {
    const text = predictor.predictAcquisition(quant("c3")).modelCaveats.join(
      " ",
    );
    expect(text).toContain("Leave-one-out base rate");
    expect(text).toContain("In-sample catalog share");
    expect(text).toContain("not this index base rate");
  });

  it("labels an outside company with the in-sample share", () => {
    const text = predictor.predictAcquisition(quant("outside")).modelCaveats
      .join(" ");
    expect(text).toContain("In-sample catalog share");
    expect(text).toContain("outside the catalog denominator");
    expect(isSufficient(
      predictor.predictAcquisition(quant("outside")).probability,
    )).toBe(true);
  });
});
