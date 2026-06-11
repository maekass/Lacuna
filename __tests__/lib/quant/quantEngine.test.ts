import { describe, expect, it } from "vitest";
import {
  AcquisitionPredictor,
  HealthImpactModeler,
  PortfolioOptimizer,
  type QuantCompany,
  ValuationEngine,
} from "@/lib/quant/quantEngine";
import { adaptQuantCompany } from "@/lib/quant/adaptQuantCompany";

function makeCompany(overrides: Partial<QuantCompany> = {}): QuantCompany {
  return {
    id: "t1",
    name: "TestCo",
    sector: "Diagnostics",
    fundingStage: "Series B",
    clinicalStage: "phase3",
    raisedToDate: 20,
    customerCount: 0,
    geographicFocus: ["US"],
    condition: "preeclampsia",
    ...overrides,
  };
}

describe("ValuationEngine", () => {
  const engine = new ValuationEngine();

  it("does not throw and returns a finite consensus (regression: percentile crash)", () => {
    const result = engine.valuateCompany(makeCompany({ annualRevenue: 10 }));
    expect(Number.isFinite(result.consensusEstimate)).toBe(true);
    expect(result.consensusEstimate).toBeGreaterThan(0);
    expect(result.consensusRange.every(Number.isFinite)).toBe(true);
  });

  it("returns INSUFFICIENT DATA (not NaN) when no inputs are present", () => {
    const result = engine.valuateCompany(
      makeCompany({ raisedToDate: 0, targetMarketSize: undefined }),
    );
    expect(result.recommendation).toBe("INSUFFICIENT DATA");
    expect(result.consensusEstimate).toBe(0);
    expect(Number.isNaN(result.consensusEstimate)).toBe(false);
  });

  it("applies a configurable Africa discount", () => {
    const base = engine.valuateCompany(makeCompany({ annualRevenue: 10 }));
    const discounted = engine.valuateCompany(
      makeCompany({ annualRevenue: 10, geographicFocus: ["Africa"] }),
    );
    expect(discounted.consensusEstimate).toBeLessThan(base.consensusEstimate);
  });
});

describe("AcquisitionPredictor", () => {
  const predictor = new AcquisitionPredictor();

  it("keeps probability within [0.05, 0.95] and varies by company quality", () => {
    const strong = predictor.predictAcquisition(
      makeCompany({ clinicalStage: "fda_approved", geographicFocus: ["US"] }),
    ).probabilityOfAcquisition;
    const weak = predictor.predictAcquisition(
      makeCompany({ clinicalStage: "preclinical", geographicFocus: ["Asia"] }),
    ).probabilityOfAcquisition;

    for (const p of [strong, weak]) {
      expect(p).toBeGreaterThanOrEqual(0.05);
      expect(p).toBeLessThanOrEqual(0.95);
    }
    // Regression: old code clamped everything to ~0.1-0.14 (a near-constant).
    expect(strong).toBeGreaterThan(weak);
  });
});

describe("HealthImpactModeler", () => {
  const modeler = new HealthImpactModeler();

  it("keeps lives-saved finite and below total global maternal deaths", () => {
    const impact = modeler.modelImpact(makeCompany({ geographicFocus: ["Africa"] }));
    expect(Number.isFinite(impact.cumulativeLivesSaved)).toBe(true);
    expect(impact.cumulativeLivesSaved).toBeGreaterThanOrEqual(0);
    // ~287k maternal deaths/yr globally (WHO) → 5yr ceiling. Old model blew past this.
    expect(impact.cumulativeLivesSaved).toBeLessThan(287_000 * 5);
  });
});

describe("PortfolioOptimizer", () => {
  it("produces varying ROI by stage and a valid bundle", () => {
    const candidates: QuantCompany[] = [
      makeCompany({ id: "a", condition: "preeclampsia", clinicalStage: "preclinical", raisedToDate: 5 }),
      makeCompany({ id: "b", condition: "pcos", clinicalStage: "fda_approved", raisedToDate: 30 }),
      makeCompany({ id: "c", condition: "sickle_cell", clinicalStage: "phase3", raisedToDate: 15 }),
    ];
    const result = new PortfolioOptimizer().optimizePortfolio(candidates, 500);
    const rois = new Set(result.companies.map((c) => c.roi));
    expect(rois.size).toBeGreaterThan(1); // not a constant 1.5 across all companies
    expect(Number.isFinite(result.expectedROI)).toBe(true);
  });
});

describe("adaptQuantCompany", () => {
  it("maps verified fields and leaves absent inputs undefined", () => {
    const adapted = adaptQuantCompany({
      id: "c1",
      name: "Modern Fertility",
      sector: "Fertility",
      stage: "Acquired by Ro (2021)",
      founded: 2017,
      hq: "San Francisco, CA",
      description: "At-home fertility testing and telehealth",
      lastKnownValuation: 225,
      totalFunding: 155,
      sources: [],
    });
    expect(adapted.company.raisedToDate).toBe(155);
    expect(adapted.company.clinicalStage).toBe("fda_approved");
    expect(adapted.company.annualRevenue).toBeUndefined();
    expect(adapted.disclosedValuation).toBe(225);
    expect(adapted.hasValuationInput).toBe(true);
  });

  it("flags companies with no funding anchor", () => {
    const adapted = adaptQuantCompany({
      id: "c2",
      name: "NoFundingCo",
      sector: "Menopause",
      stage: "Private (Seed)",
      founded: 2022,
      hq: "London, UK",
      description: "Menopause care platform",
      sources: [],
    });
    expect(adapted.hasValuationInput).toBe(false);
    expect(adapted.company.raisedToDate).toBe(0);
  });
});
