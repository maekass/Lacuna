import { describe, expect, it } from "vitest";
import {
  deriveEmpiricalPriors,
  getSectorPrior,
  normalizeSectorBucket,
} from "@/lib/quant/empiricalPriors";
import {
  AcquisitionPredictor,
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
  const companies = [
    makeCompanyView({ id: "c1", sector: "Diagnostics", totalFunding: 50 }),
    makeCompanyView({
      id: "c2",
      sector: "Diagnostics",
      totalFunding: 100,
      stage: "Acquired by BigCo (2021)",
    }),
    makeCompanyView({ id: "c3", sector: "Fertility", totalFunding: 20 }),
  ];
  const deals = [
    makeDeal({ id: "d1", targetId: "c1", dealValue: 400 }),
    makeDeal({ id: "d2", targetId: "c2", dealValue: 500 }),
    makeDeal({ id: "d3", targetId: "c3", dealValue: undefined }),
  ];

  it("computes the overall exit rate from acquired targets", () => {
    const priors = deriveEmpiricalPriors(companies, deals);
    // All 3 companies are deal targets → exit rate 100%.
    expect(priors.overallExitRate).toBe(1);
    expect(priors.dealCount).toBe(3);
    expect(priors.disclosedDealCount).toBe(2);
  });

  it("derives sector funding-to-exit multiples from real pairs", () => {
    const priors = deriveEmpiricalPriors(companies, deals);
    const diag = getSectorPrior(priors, "Diagnostics");
    expect(diag).toBeDefined();
    expect(diag!.dealCount).toBe(2);
    // multiples: 400/50=8, 500/100=5 → median 6.5
    expect(diag!.medianFundingMultiple).toBeCloseTo(6.5);
    expect(diag!.fundingMultipleN).toBe(2);
  });

  it("handles sectors with no disclosed values gracefully", () => {
    const priors = deriveEmpiricalPriors(companies, deals);
    const fert = getSectorPrior(priors, "Fertility");
    expect(fert).toBeDefined();
    expect(fert!.medianDealValue).toBeUndefined();
    expect(fert!.fundingMultipleN).toBe(0);
  });

  it("is deterministic — same input yields identical priors", () => {
    const a = deriveEmpiricalPriors(companies, deals);
    const b = deriveEmpiricalPriors(companies, deals);
    expect(a.overallExitRate).toBe(b.overallExitRate);
    expect(a.medianFundingMultipleAll).toBe(b.medianFundingMultipleAll);
  });

  it("returns safe values for an empty dataset", () => {
    const priors = deriveEmpiricalPriors([], []);
    expect(priors.overallExitRate).toBe(0);
    expect(priors.medianDealValueAll).toBeUndefined();
    expect(Number.isNaN(priors.overallExitRate)).toBe(false);
  });
});

describe("ValuationEngine with empirical priors", () => {
  const companies = [
    makeCompanyView({ id: "c1", sector: "Diagnostics", totalFunding: 50 }),
    makeCompanyView({ id: "c2", sector: "Diagnostics", totalFunding: 100 }),
  ];
  const deals = [
    makeDeal({ id: "d1", targetId: "c1", dealValue: 400 }),
    makeDeal({ id: "d2", targetId: "c2", dealValue: 500 }),
  ];
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
    // 30 raised × 6.5 median multiple = 195
    expect(comparable!.estimate).toBeCloseTo(195);
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
  ];
  const deals = [makeDeal({ id: "d1", targetId: "c1" })];
  const priors = deriveEmpiricalPriors(companies, deals);

  it("uses the dataset's observed exit rate as the base rate", () => {
    // 1 acquired of 4 companies = 25% base rate, vs 35% heuristic default.
    expect(priors.overallExitRate).toBe(0.25);
    const withPriors = new AcquisitionPredictor(priors);
    const withoutPriors = new AcquisitionPredictor();
    const company: QuantCompany = {
      id: "q1",
      name: "QuantCo",
      sector: "Menopause", // no sector deals → no sector adjustment
      fundingStage: "Series B",
      clinicalStage: "phase3",
      raisedToDate: 30,
      customerCount: 0,
      geographicFocus: ["US"],
      condition: "pcos",
    };
    const pEmpirical = withPriors.predictAcquisition(company)
      .probabilityOfAcquisition;
    const pHeuristic = withoutPriors.predictAcquisition(company)
      .probabilityOfAcquisition;
    // Lower empirical base rate (25% < 35%) → lower probability.
    expect(pEmpirical).toBeLessThan(pHeuristic);
  });

  it("keeps probability bounded in [0.05, 0.95] with priors", () => {
    const predictor = new AcquisitionPredictor(priors);
    const p = predictor.predictAcquisition({
      id: "q2",
      name: "EdgeCo",
      sector: "Diagnostics",
      fundingStage: "Seed",
      clinicalStage: "preclinical",
      raisedToDate: 0,
      customerCount: 0,
      geographicFocus: ["Asia"],
      condition: "pcos",
    }).probabilityOfAcquisition;
    expect(p).toBeGreaterThanOrEqual(0.05);
    expect(p).toBeLessThanOrEqual(0.95);
  });
});
