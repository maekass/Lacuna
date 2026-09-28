import { describe, expect, it } from "vitest";
import {
  AcquisitionPredictor,
  HealthImpactModeler,
  isSufficient,
  numericOrNull,
  PortfolioOptimizer,
  type QuantCompany,
  ValuationEngine,
} from "@/lib/quant/quantEngine";
import { adaptQuantCompany } from "@/lib/quant/adaptQuantCompany";
import { geographicMultiplier } from "@/lib/quant/priors";
import { missingInput, sufficient } from "@/lib/quant/estimators";
import type { EmpiricalPriors, SectorPrior } from "@/lib/quant/empiricalPriors";

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

  it("does not invent TAM or sector-multiple consensus without verified comparables", () => {
    const result = engine.valuateCompany(makeCompany({ annualRevenue: 10 }));
    expect(result.recommendation).toBe("INSUFFICIENT DATA");
    expect(numericOrNull(result.consensus)).toBeNull();
    expect(isSufficient(result.consensus)).toBe(false);
  });

  it("returns INSUFFICIENT DATA (not NaN) when no inputs are present", () => {
    const result = engine.valuateCompany(
      makeCompany({ raisedToDate: 0, targetMarketSize: undefined }),
    );
    expect(result.recommendation).toBe("INSUFFICIENT DATA");
    expect(numericOrNull(result.consensus)).toBeNull();
  });

  it("does not apply an invented Africa geographic discount", () => {
    const base = numericOrNull(
      engine.valuateCompany(makeCompany({ annualRevenue: 10 })).consensus,
    );
    const africa = numericOrNull(
      engine.valuateCompany(
        makeCompany({ annualRevenue: 10, geographicFocus: ["Africa"] }),
      ).consensus,
    );
    expect(base).toBeNull();
    expect(africa).toBeNull();
    expect(geographicMultiplier(makeCompany({ geographicFocus: ["Africa"] })))
      .toBe(1);
  });

  it("uses an explicit Africa multiplier only for companies focused on Africa", () => {
    expect(
      geographicMultiplier(
        makeCompany({
          geographicFocus: ["US"],
          africaDiscountMultiplier: 0.7,
        }),
      ),
    ).toBe(1);
    expect(
      geographicMultiplier(
        makeCompany({
          geographicFocus: ["Africa"],
          africaDiscountMultiplier: 0.7,
        }),
      ),
    ).toBe(0.7);
    expect(
      geographicMultiplier(makeCompany({ geographicFocus: ["Africa"] })),
    ).toBe(1);
  });

  it("does not haircut an Africa HQ when a verified funding anchor exists", () => {
    const sector: SectorPrior = {
      sector: "diagnostics",
      dealCount: 4,
      disclosedDealCount: 4,
      disclosedFraction: 1,
      selectionCaveat: "test",
      companyCount: 4,
      acquiredInSector: 1,
      medianDealValueEstimate: missingInput("none"),
      medianFundingMultipleEstimate: sufficient({
        value: 2,
        sampleSize: 4,
        confidenceInterval: [1.5, 2.5],
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
      sectorPriors: new Map([["diagnostics", sector]]),
      derivationNote: "test",
    };
    const anchored = new ValuationEngine(priors);
    const us = numericOrNull(
      anchored.valuateCompany(makeCompany({ raisedToDate: 20 })).consensus,
    );
    const africa = numericOrNull(
      anchored.valuateCompany(
        makeCompany({ raisedToDate: 20, geographicFocus: ["Africa"] }),
      ).consensus,
    );
    expect(us).toBe(40);
    expect(africa).toBe(us);
    expect(
      anchored.valuateCompany(makeCompany({ raisedToDate: 20 }))
        .recommendation,
    ).toBe("DESCRIPTIVE HEURISTIC ONLY");
  });
});

describe("AcquisitionPredictor", () => {
  const predictor = new AcquisitionPredictor();

  it("withholds probability without calibrated dataset exit rates", () => {
    const strong = numericOrNull(
      predictor.predictAcquisition(
        makeCompany({ clinicalStage: "fda_approved", geographicFocus: ["US"] }),
      ).probability,
    );
    const weak = numericOrNull(
      predictor.predictAcquisition(
        makeCompany({
          clinicalStage: "preclinical",
          geographicFocus: ["Asia"],
        }),
      ).probability,
    );

    expect(strong).toBeNull();
    expect(weak).toBeNull();
  });
});

describe("HealthImpactModeler", () => {
  const modeler = new HealthImpactModeler();

  it("withholds invented population/mortality lives-saved priors", () => {
    const impact = modeler.modelImpact(
      makeCompany({ geographicFocus: ["Africa"] }),
    );
    expect(impact.cumulativeLivesSaved).toBe(0);
    expect(impact.annualLivesSaved).toEqual([]);
    expect(impact.assumptions[0]).toMatch(/Insufficient disclosed data/);
  });
});

describe("PortfolioOptimizer", () => {
  it("does not build a bundle from invented TAM or sector-multiple methods", () => {
    const candidates: QuantCompany[] = [
      makeCompany({
        id: "a",
        condition: "preeclampsia",
        clinicalStage: "preclinical",
        raisedToDate: 5,
        annualRevenue: 3,
        targetMarketSize: 100,
      }),
      makeCompany({
        id: "b",
        condition: "pcos",
        clinicalStage: "fda_approved",
        raisedToDate: 30,
        annualRevenue: 20,
        targetMarketSize: 500,
      }),
      makeCompany({
        id: "c",
        condition: "sickle_cell",
        clinicalStage: "phase3",
        raisedToDate: 15,
        annualRevenue: 8,
        targetMarketSize: 250,
      }),
    ];
    const result = new PortfolioOptimizer().optimizePortfolio(candidates, 500);
    expect(result.companies).toHaveLength(0);
    expect(numericOrNull(result.expectedROI)).toBeNull();
  });

  it("does not fabricate portfolio ROI from point-only valuations", () => {
    const candidates: QuantCompany[] = [
      makeCompany({ id: "point-a", raisedToDate: 5 }),
      makeCompany({ id: "point-b", raisedToDate: 30 }),
    ];
    const result = new PortfolioOptimizer().optimizePortfolio(candidates, 500);
    expect(result.companies).toHaveLength(0);
    expect(numericOrNull(result.expectedROI)).toBeNull();
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
    expect(adapted.company.clinicalStage).toBeUndefined();
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
