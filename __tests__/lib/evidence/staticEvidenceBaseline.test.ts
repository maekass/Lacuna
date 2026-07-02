import { describe, expect, it } from "vitest";
import {
  deriveTaxonomyEvidenceInputs,
  hasLiveEvidenceEnrichment,
  resolveEvidenceInputs,
} from "@/lib/evidence/staticEvidenceBaseline";

describe("deriveTaxonomyEvidenceInputs", () => {
  it("returns non-zero phase signal for clinical_therapeutic (success)", () => {
    const inputs = deriveTaxonomyEvidenceInputs("clinical_therapeutic");
    expect(inputs.totalTrials).toBeGreaterThan(0);
    expect(inputs.highestPhase).not.toBe("None");
  });
});

describe("resolveEvidenceInputs", () => {
  it("prefers live CTG enrichment over taxonomy (success)", () => {
    const resolved = resolveEvidenceInputs(
      "consumer_wellness",
      { trials: 3, highestPhase: "PHASE3", hasResults: true },
      undefined,
    );
    expect(resolved.source).toBe("live");
    expect(resolved.inputs.totalTrials).toBe(3);
    expect(resolved.inputs.highestPhase).toBe("PHASE3");
  });

  it("falls back to taxonomy when live data is absent (edge)", () => {
    const resolved = resolveEvidenceInputs(
      "diagnostic_genomic",
      undefined,
      undefined,
    );
    expect(resolved.source).toBe("taxonomy");
    expect(resolved.inputs.highestFDAClearance).toBe("510(K)");
  });

  it("returns empty inputs for portfolio_investment without live data (edge)", () => {
    const resolved = resolveEvidenceInputs(
      "portfolio_investment",
      undefined,
      undefined,
    );
    expect(resolved.source).toBe("empty");
    expect(resolved.inputs.totalTrials).toBe(0);
  });
});

describe("hasLiveEvidenceEnrichment", () => {
  it("detects FDA clearance as live signal (success)", () => {
    expect(
      hasLiveEvidenceEnrichment("Example Co", undefined, {
        clearance: "510(K)",
        hasDrug: false,
        products: 1,
      }),
    ).toBe(true);
  });
});
