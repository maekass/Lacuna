import { describe, expect, it } from "vitest";
import {
  calculateDossier,
  sensitivity,
} from "../../../src/lib/biopharma/diligenceModel";
import { renderDossierReport } from "../../../src/lib/biopharma/dossierReport";

// Arithmetic fixture only; no values here are company data or product defaults.
const citation = {
  url: "https://clinicaltrials.gov/study/NCT00000001",
  title: "Test fixture",
  accessedAt: "2026-09-17",
  locator: "Study record",
};
const observed = (value: number) => ({
  kind: "observed",
  value,
  source: citation,
});
const assumed = (value: number) => ({
  kind: "analyst_assumption",
  value,
  rationale: "Fixture arithmetic",
  reviewedBy: "Test reviewer",
  reviewedAt: "2026-09-17",
  evidence: [citation],
});

function fixture() {
  return {
    company: "Fixture company",
    ticker: "TEST",
    asOf: "2026-09-17",
    valuationYear: 2026,
    discountRate: assumed(0.1),
    cashUsd: observed(50),
    debtUsd: observed(10),
    dilutedShares: observed(10),
    financingScenario: { proceedsUsd: assumed(20), newShares: assumed(2) },
    assets: [{
      assetId: "a-1",
      drug: "Fixture drug",
      indication: "Fixture indication",
      stage: "Phase 2",
      trialIds: ["NCT00000001"],
      endpoint: "Fixture endpoint",
      standardOfCare: "Fixture comparator",
      clinicalEvidence: [citation],
      ptrs: assumed(0.5),
      launchYear: assumed(2027),
      forecast: [{
        year: 2027,
        eligiblePatients: assumed(100),
        diagnosisRate: assumed(0.5),
        treatmentRate: assumed(0.5),
        marketShare: assumed(0.2),
        annualGrossPriceUsd: assumed(100),
        grossToNetDiscount: assumed(0.1),
        treatmentYearFraction: assumed(1),
        operatingMargin: assumed(0.5),
        developmentCostUsd: assumed(100),
      }],
    }],
    catalysts: [{
      assetId: "a-1",
      event: "Readout",
      scheduledDate: "2026-12-01",
      datePrecision: "month",
      dateBasis: "sponsor guidance",
      decisionCriterion: "Primary endpoint",
      bullInterpretation: "Meaningful separation",
      bearInterpretation: "No separation",
      source: citation,
    }],
    thesis: {
      variantPerception: "Fixture claim",
      evidenceForDifference: [citation],
      whatChangesTheDebate: "Fixture readout",
      risks: ["Endpoint failure"],
      author: "Fixture author",
      reviewedBy: "Fixture reviewer",
    },
  };
}

describe("biopharma diligence", () => {
  it("discounts risked success cash flow, subtracts certain development cost, and applies financing once", () => {
    const result = calculateDossier(fixture());
    const year = result.assets[0]!.years[0]!;
    expect(year.treatedPatients).toBe(5);
    expect(year.revenueUsd).toBe(450);
    expect(year.discountedRiskAdjustedCashFlowUsd).toBeCloseTo(12.5 / 1.1);
    expect(result.impliedValuePerShareUsd).toBeCloseTo((12.5 / 1.1 + 40) / 10);
    expect(result.financingScenarioValuePerShareUsd).toBeCloseTo(
      (12.5 / 1.1 + 60) / 12,
    );
  });

  it("withholds incomplete provenance and invalid asset/catalyst links", () => {
    const missing = fixture();
    missing.assets[0]!.forecast[0]!.marketShare = {
      ...assumed(0.2),
      evidence: [],
    };
    expect(() => calculateDossier(missing)).toThrow();
    const dangling = fixture();
    dangling.catalysts[0]!.assetId = "unknown";
    expect(() => calculateDossier(dangling)).toThrow(/unknown asset/);
  });

  it("changes only the selected asset in the sensitivity grid", () => {
    const cases = sensitivity(fixture(), "a-1", [0, 0.5], [1]);
    expect(cases).toHaveLength(2);
    expect(cases[1]!.impliedValuePerShareUsd).toBeCloseTo(
      calculateDossier(fixture()).impliedValuePerShareUsd,
    );
    expect(cases[0]!.impliedValuePerShareUsd).toBeLessThan(
      cases[1]!.impliedValuePerShareUsd,
    );
  });

  it("renders all four analyst artifacts with a primary evidence link", () => {
    const report = renderDossierReport(fixture());
    expect(report).toContain("Clinical pipeline and catalysts");
    expect(report).toContain("Drug revenue forecast");
    expect(report).toContain("Risk adjusted valuation");
    expect(report).toContain("Investment thesis");
    expect(report).toContain(citation.url);
  });
});
