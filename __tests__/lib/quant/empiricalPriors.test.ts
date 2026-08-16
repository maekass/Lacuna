import { describe, expect, it } from "vitest";
import {
  deriveEmpiricalPriors,
  getSectorPrior,
  normalizeSectorBucket,
} from "@/lib/quant/empiricalPriors";
import {
  AcquisitionPredictor,
  isSufficient,
  numericOrNull,
  type QuantCompany,
  ValuationEngine,
} from "@/lib/quant/quantEngine";
import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";

function makeCompanyView(
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
    ...overrides,
  };
}

function makeDeal(
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

describe("normalizeSectorBucket", () => {
  it("pools sector variants into shared buckets", () => {
    expect(normalizeSectorBucket("Diagnostics")).toBe("diagnostics");
    expect(normalizeSectorBucket("Diagnostics / Oncology Screening")).toBe(
      "diagnostics",
    );
    expect(normalizeSectorBucket("Fertility")).toBe("fertility");
    expect(normalizeSectorBucket("Reproductive Health")).toBe("fertility");
    expect(normalizeSectorBucket("Something Unmapped")).toBe("other");
  });
});

describe("deriveEmpiricalPriors", () => {
  const companies = Array.from({ length: 6 }, (_, i) =>
    makeCompanyView({
      id: `c${i + 1}`,
      sector: "Diagnostics",
      totalFunding: 50 + i * 10,
      stage: i < 2 ? "Acquired by BigCo (2021)" : "Series B",
    }));
  const deals = [
    makeDeal({ id: "d1", targetId: "c1", dealValue: 400 }),
    makeDeal({ id: "d2", targetId: "c2", dealValue: 500 }),
  ];

  it("computes the overall exit rate from acquired targets", () => {
    const priors = deriveEmpiricalPriors(companies, deals);
    expect(isSufficient(priors.overallExitRateEstimate)).toBe(true);
    // 2 acquired of 6 companies
    expect(priors.overallExitRateEstimate).toMatchObject({
      kind: "sufficient",
      value: 2 / 6,
    });
    expect(priors.dealCount).toBe(2);
    expect(priors.disclosedDealCount).toBe(2);
    expect(priors.disclosedFraction).toBe(1);
  });

  it("derives sector funding-to-exit multiples from real pairs", () => {
    const priors = deriveEmpiricalPriors(companies, deals);
    const diag = getSectorPrior(priors, "Diagnostics");
    expect(diag).toBeDefined();
    expect(diag!.dealCount).toBe(2);
    // n=2 is below MIN_FUNDING_MULTIPLE_SAMPLE (3) — gated insufficient
    expect(isSufficient(diag!.medianFundingMultipleEstimate)).toBe(false);
    expect(diag!.medianFundingMultipleEstimate.kind).toBe("insufficient");
  });

  it("returns insufficient median when sector sample is below threshold", () => {
    const priors = deriveEmpiricalPriors(companies, deals);
    const diag = getSectorPrior(priors, "Diagnostics");
    expect(diag).toBeDefined();
    // n=2 disclosed deals — below MIN_SECTOR_SAMPLE (5)
    expect(isSufficient(diag!.medianDealValueEstimate)).toBe(false);
    expect(isSufficient(diag!.medianFundingMultipleEstimate)).toBe(false);
  });

  it("is deterministic — same input yields identical priors", () => {
    const a = deriveEmpiricalPriors(companies, deals);
    const b = deriveEmpiricalPriors(companies, deals);
    expect(numericOrNull(a.overallExitRateEstimate)).toBe(
      numericOrNull(b.overallExitRateEstimate),
    );
    expect(a.selectionCaveat).toBe(b.selectionCaveat);
  });

  it("returns insufficient exit rate for an empty dataset", () => {
    const priors = deriveEmpiricalPriors([], []);
    expect(isSufficient(priors.overallExitRateEstimate)).toBe(false);
    expect(isSufficient(priors.medianDealValueAllEstimate)).toBe(false);
  });
});

describe("ValuationEngine with empirical priors", () => {
  const companies = Array.from({ length: 6 }, (_, i) =>
    makeCompanyView({
      id: `c${i + 1}`,
      sector: "Diagnostics",
      totalFunding: 50 + i * 10,
    }));
  const deals = companies.map((c, i) =>
    makeDeal({
      id: `d${i + 1}`,
      targetId: c.id,
      dealValue: 300 + i * 50,
    })
  );
  const priors = deriveEmpiricalPriors(companies, deals);

  function quantCompany(overrides: Partial<QuantCompany> = {}): QuantCompany {
    return {
      id: "q1",
      name: "QuantCo",
      sector: "Diagnostics",
      fundingStage: "Series B",
      clinicalStage: "phase3",
      raisedToDate: 30,
      customerCount: 0,
      geographicFocus: ["US"],
      condition: "preeclampsia",
      ...overrides,
    };
  }

  it("anchors valuation on verified comparable deals when priors supplied", () => {
    const engine = new ValuationEngine(priors);
    const result = engine.valuateCompany(quantCompany());
    const comparable = result.valuations.find(
      (v) => v.methodName === "Comparable Deals",
    );
    expect(comparable).toBeDefined();
    expect(comparable!.confidence).toBeGreaterThan(0);
    const estimate = numericOrNull(comparable!.estimate);
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThan(0);
  });

  it("omits the comparable-deals method without priors (backward compat)", () => {
    const engine = new ValuationEngine();
    const result = engine.valuateCompany(quantCompany());
    const comparable = result.valuations.find(
      (v) => v.methodName === "Comparable Deals" && v.confidence > 0,
    );
    expect(comparable).toBeUndefined();
  });

  it("skips comparables for sectors with no verified deals", () => {
    const engine = new ValuationEngine(priors);
    const result = engine.valuateCompany(
      quantCompany({ sector: "Menopause" }),
    );
    const comparable = result.valuations.find(
      (v) => v.methodName === "Comparable Deals" && v.confidence > 0,
    );
    expect(comparable).toBeUndefined();
  });
});

describe("AcquisitionPredictor with empirical priors", () => {
  const companies = [
    makeCompanyView({ id: "c1", sector: "Diagnostics" }),
    makeCompanyView({ id: "c2", sector: "Fertility", stage: "Series A" }),
    makeCompanyView({ id: "c3", sector: "Fertility", stage: "Series A" }),
    makeCompanyView({ id: "c4", sector: "Fertility", stage: "Series A" }),
    makeCompanyView({ id: "c5", sector: "Fertility", stage: "Series A" }),
    makeCompanyView({ id: "c6", sector: "Fertility", stage: "Series A" }),
  ];
  const deals = [makeDeal({ id: "d1", targetId: "c1" })];
  const priors = deriveEmpiricalPriors(companies, deals);

  it("uses the dataset's observed exit rate as the base rate", () => {
    expect(isSufficient(priors.overallExitRateEstimate)).toBe(true);
    expect(priors.overallExitRateEstimate).toMatchObject({
      kind: "sufficient",
      value: 1 / 6,
    });
    const withPriors = new AcquisitionPredictor(priors);
    const withoutPriors = new AcquisitionPredictor();
    const company: QuantCompany = {
      id: "q1",
      name: "QuantCo",
      sector: "Menopause",
      fundingStage: "Series B",
      clinicalStage: "phase3",
      raisedToDate: 30,
      customerCount: 0,
      geographicFocus: ["US"],
      condition: "pcos",
    };
    const pEmpirical = numericOrNull(
      withPriors.predictAcquisition(company).probability,
    );
    const pWithoutPriors = numericOrNull(
      withoutPriors.predictAcquisition(company).probability,
    );
    expect(pEmpirical).not.toBeNull();
    expect(pWithoutPriors).toBeNull();
  });

  it("keeps probability bounded in [0.05, 0.95] with priors", () => {
    const predictor = new AcquisitionPredictor(priors);
    const p = numericOrNull(
      predictor.predictAcquisition({
        id: "q2",
        name: "EdgeCo",
        sector: "Diagnostics",
        fundingStage: "Seed",
        clinicalStage: "preclinical",
        raisedToDate: 0,
        customerCount: 0,
        geographicFocus: ["Asia"],
        condition: "pcos",
      }).probability,
    );
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThanOrEqual(0.05);
    expect(p!).toBeLessThanOrEqual(0.95);
  });
});
