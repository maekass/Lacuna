import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import type { EmpiricalPriors, SectorPrior } from "@/lib/quant/empiricalPriors";
import {
  AcquisitionPredictor,
  isSufficient,
  missingInput,
  type QuantCompany,
  type QuantValue,
  sufficient,
} from "@/lib/quant/quantEngine";

const TOTAL_DEALS = 100;

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
 * Diagnostics holds `sectorShare` of catalog deals and a sufficient exit-rate
 * interval, so the sector adjustment is controlled by the fixture.
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

function probability(
  opts: PriorsOptions,
  company: QuantCompany = makeCompany(),
): QuantValue<number> {
  return new AcquisitionPredictor(makePriors(opts)).predictAcquisition(company)
    .probability;
}

function expectOrdered(result: QuantValue<number>) {
  expect(isSufficient(result)).toBe(true);
  if (!isSufficient(result)) return;
  const [lo, hi] = result.confidenceInterval;
  expect(lo).toBeLessThanOrEqual(result.value);
  expect(result.value).toBeLessThanOrEqual(hi);
}

describe("AcquisitionPredictor sector adjustment", () => {
  it("keeps the point inside the interval when sector share is below 0.20", () => {
    // Share 0.05 maps to adjustment 0.8. Applying that factor only to the
    // point used to place the point below its own lower bound.
    const result = probability({
      sectorShare: 0.05,
      exitRate: 0.5,
      ci: [0.48, 0.52],
    });
    expectOrdered(result);
  });

  it.each([
    ["0.8 (share 0.10)", 0.1, 0.8],
    ["1 (share 0.20)", 0.2, 1],
    ["1.2 (share 0.30)", 0.3, 1.2],
  ])(
    "scales the point and both bounds by %s",
    (_label, sectorShare, multiplier) => {
      const exitRate = 0.5;
      const ci: [number, number] = [0.4, 0.6];
      const neutral = probability({ sectorShare: 0.2, exitRate, ci });
      const scaled = probability({ sectorShare, exitRate, ci });
      expectOrdered(scaled);
      if (!isSufficient(neutral) || !isSufficient(scaled)) return;
      expect(scaled.value).toBeCloseTo(neutral.value * multiplier, 10);
      expect(scaled.confidenceInterval[0]).toBeCloseTo(
        neutral.confidenceInterval[0] * multiplier,
        10,
      );
      expect(scaled.confidenceInterval[1]).toBeCloseTo(
        neutral.confidenceInterval[1] * multiplier,
        10,
      );
    },
  );

  it("does not cap the index at 0.95", () => {
    const company = makeCompany({
      clinicalStage: "fda_approved",
      raisedToDate: 5,
      annualRevenue: 20,
      targetMarketSize: 2000,
      geographicFocus: ["US", "Africa", "Asia"],
      teamMetrics: {
        founderSerialEntrepreneur: true,
        advisorStrength: 3,
        retentionRisk: 0,
      },
    });
    const exitRate = 0.99;
    const ci: [number, number] = [0.97, 1];
    const neutral = probability({ sectorShare: 0.2, exitRate, ci }, company);
    const scaled = probability({ sectorShare: 0.3, exitRate, ci }, company);
    expectOrdered(scaled);
    if (!isSufficient(neutral) || !isSufficient(scaled)) return;
    expect(scaled.value).toBeCloseTo(neutral.value * 1.2, 10);
    expect(scaled.confidenceInterval[1]).toBeCloseTo(
      neutral.confidenceInterval[1] * 1.2,
      10,
    );
    expect(scaled.value).toBeGreaterThan(0.95);
    expect(scaled.confidenceInterval[1]).toBeGreaterThan(0.95);
  });

  it("withholds the index below reportable resolution", () => {
    const result = probability(
      { sectorShare: 0.05, exitRate: 0.02, ci: [0.01, 0.03] },
      makeCompany({ clinicalStage: "preclinical", geographicFocus: ["Asia"] }),
    );
    expect(result).toMatchObject({
      kind: "insufficient",
      code: "missing_input",
      message: "Below reportable resolution",
    });
  });

  it("withholds the index when the exit-rate interval excludes the point", () => {
    const result = probability({
      sectorShare: 0.2,
      exitRate: 0.4,
      ci: [0.8, 0.9],
    });
    expect(result).toMatchObject({
      kind: "insufficient",
      code: "missing_input",
      message: "Interval inconsistent with point estimate",
    });
  });

  it("leaves the adjustment at 1 when the sector has no prior", () => {
    const opts: PriorsOptions = {
      sectorShare: 0.05,
      exitRate: 0.5,
      ci: [0.4, 0.6],
    };
    const adjusted = probability(opts);
    const unadjusted = probability(
      opts,
      makeCompany({ sector: "Menopause" }),
    );
    expectOrdered(adjusted);
    expectOrdered(unadjusted);
    if (!isSufficient(adjusted) || !isSufficient(unadjusted)) return;
    expect(adjusted.value).toBeCloseTo(unadjusted.value * 0.8, 10);
    expect(adjusted.confidenceInterval[0]).toBeCloseTo(
      unadjusted.confidenceInterval[0] * 0.8,
      10,
    );
    expect(adjusted.confidenceInterval[1]).toBeCloseTo(
      unadjusted.confidenceInterval[1] * 0.8,
      10,
    );
  });

  it("keeps a sufficient index ordered and withholds sub-resolution inputs", () => {
    const stages = [
      "preclinical",
      "phase2",
      "phase3",
      "fda_approved",
    ] as const;
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.constantFrom(...stages),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (
          sectorShare,
          exitRate,
          loGap,
          hiGap,
          clinicalStage,
          raisedToDate,
        ) => {
          const ci: [number, number] = [
            Math.max(0, exitRate - loGap),
            Math.min(1, exitRate + hiGap),
          ];
          const result = probability(
            { sectorShare, exitRate, ci },
            makeCompany({ clinicalStage, raisedToDate }),
          );
          if (!isSufficient(result)) {
            expect(result).toMatchObject({
              kind: "insufficient",
              code: "missing_input",
              message: "Below reportable resolution",
            });
            return true;
          }
          const [lo, hi] = result.confidenceInterval;
          expect(lo).toBeLessThanOrEqual(result.value);
          expect(result.value).toBeLessThanOrEqual(hi);
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});
