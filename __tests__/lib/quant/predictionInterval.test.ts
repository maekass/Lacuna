import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import type { EmpiricalPriors, SectorPrior } from "@/lib/quant/empiricalPriors";
import { AcquisitionPredictor } from "@/lib/quant/predictionEngines";
import { isSufficient, missingInput, sufficient } from "@/lib/quant/estimators";
import type { QuantCompany, QuantValue } from "@/lib/quant/types";

const TOTAL_DEALS = 100;
const P_MIN = 0.05;
const P_MAX = 0.95;

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

interface PriorsOptions {
  sectorShare: number;
  exitRate: number;
  ci: [number, number];
}

/**
 * Hand-built priors whose diagnostics bucket holds `sectorShare` of all
 * deals and carries a sufficient exit-rate CI, so the sector multiplier
 * `clamp(sectorShare * 5, 0.8, 1.2)` is fully controlled by the test.
 */
function makePriors(
  { sectorShare, exitRate, ci }: PriorsOptions,
): EmpiricalPriors {
  const sectorDeals = Math.round(sectorShare * TOTAL_DEALS);
  const rate: QuantValue<number> = sufficient({
    value: exitRate,
    sampleSize: 40,
    confidenceInterval: ci,
    disclosedFraction: 0.5,
  });
  const sector: SectorPrior = {
    sector: "diagnostics",
    dealCount: sectorDeals,
    disclosedDealCount: sectorDeals,
    disclosedFraction: 1,
    selectionCaveat: "",
    companyCount: 40,
    acquiredInSector: sectorDeals,
    medianDealValueEstimate: missingInput("n/a"),
    medianFundingMultipleEstimate: missingInput("n/a"),
    sectorExitRateEstimate: rate,
  };
  return {
    overallExitRateEstimate: rate,
    companyCount: 150,
    dealCount: TOTAL_DEALS,
    disclosedDealCount: TOTAL_DEALS,
    disclosedFraction: 1,
    selectionCaveat: "",
    medianDealValueAllEstimate: missingInput("n/a"),
    medianFundingMultipleAllEstimate: missingInput("n/a"),
    sectorPriors: new Map([["diagnostics", sector]]),
    derivationNote: "test fixture",
  };
}

function predict(
  opts: PriorsOptions,
  company: QuantCompany = makeCompany(),
) {
  const result = new AcquisitionPredictor(makePriors(opts))
    .predictAcquisition(company).probability;
  if (!isSufficient(result)) throw new Error("expected sufficient probability");
  return {
    value: result.value,
    lo: result.confidenceInterval[0],
    hi: result.confidenceInterval[1],
  };
}

function expectOrdered(p: { value: number; lo: number; hi: number }) {
  expect(p.lo).toBeLessThanOrEqual(p.value);
  expect(p.value).toBeLessThanOrEqual(p.hi);
  expect(p.lo).toBeLessThanOrEqual(p.hi);
}

describe("AcquisitionPredictor interval / sector multiplier consistency", () => {
  it("regression: point estimate is not below its lower bound when sector share < 0.20", () => {
    // Pre-fix: value = 0.5*0.8*w, lo = 0.48*w → value < lo for every w.
    const p = predict({ sectorShare: 0.05, exitRate: 0.5, ci: [0.48, 0.52] });
    expectOrdered(p);
    expect(p.value).toBeGreaterThanOrEqual(p.lo);
  });

  it.each([
    ["below 1 (share 0.10 → 0.8)", 0.1, 0.8],
    ["exactly 1 (share 0.20)", 0.2, 1],
    ["above 1 (share 0.30 → 1.2)", 0.3, 1.2],
  ])(
    "applies the same multiplier %s to value and both bounds",
    (_label, sectorShare, multiplier) => {
      const exitRate = 0.5;
      const ci: [number, number] = [0.4, 0.6];
      const neutral = predict({ sectorShare: 0.2, exitRate, ci });
      const scaled = predict({ sectorShare, exitRate, ci });
      expectOrdered(scaled);
      expect(scaled.value).toBeCloseTo(neutral.value * multiplier, 10);
      expect(scaled.lo).toBeCloseTo(neutral.lo * multiplier, 10);
      expect(scaled.hi).toBeCloseTo(neutral.hi * multiplier, 10);
    },
  );

  it("stays ordered at the upper clamp", () => {
    const p = predict(
      { sectorShare: 0.3, exitRate: 0.99, ci: [0.97, 1] },
      makeCompany({
        clinicalStage: "fda_approved",
        raisedToDate: 5,
        annualRevenue: 20,
        targetMarketSize: 2000,
        geographicFocus: ["US", "Africa", "EU"],
        teamMetrics: {
          founderSerialEntrepreneur: true,
          advisorStrength: 3,
          retentionRisk: 0,
        },
      }),
    );
    expectOrdered(p);
    expect(p.hi).toBe(P_MAX);
    expect(p.value).toBe(P_MAX);
  });

  it("stays ordered at the lower clamp", () => {
    const p = predict(
      { sectorShare: 0.05, exitRate: 0.02, ci: [0.01, 0.03] },
      makeCompany({ clinicalStage: "preclinical", geographicFocus: ["Asia"] }),
    );
    expectOrdered(p);
    expect(p.lo).toBe(P_MIN);
    expect(p.value).toBe(P_MIN);
  });

  it("property: lo <= value <= hi within [0.05, 0.95] for any share, rate, and score inputs", () => {
    const stages = ["preclinical", "phase2", "phase3", "fda_approved"] as const;
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.constantFrom(...stages),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (sectorShare, exitRate, loGap, hiGap, clinicalStage, raisedToDate) => {
          const ci: [number, number] = [
            Math.max(0, exitRate - loGap),
            Math.min(1, exitRate + hiGap),
          ];
          const p = predict(
            { sectorShare, exitRate, ci },
            makeCompany({ clinicalStage, raisedToDate }),
          );
          expectOrdered(p);
          expect(p.lo).toBeGreaterThanOrEqual(P_MIN);
          expect(p.hi).toBeLessThanOrEqual(P_MAX);
        },
      ),
      { numRuns: 300 },
    );
  });
});
