import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RESEARCH_INTEGRITY_PROHIBITIONS } from "@/lib/research/evidenceBoundaries";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("research integrity prohibitions", () => {
  it("keeps the ten public boundaries", () => {
    expect(RESEARCH_INTEGRITY_PROHIBITIONS).toEqual([
      "Lacuna does not turn report context into a company score.",
      "Lacuna does not turn a gap into a valuation.",
      "Lacuna does not turn historical exits into an acquisition prediction.",
      "Lacuna does not turn research representation into clinical validation.",
      "Lacuna does not turn a qualitative expert assessment into an objective metric.",
      "Lacuna does not turn unavailable data into 0.",
      "Lacuna does not turn unknown into a negative finding.",
      "Lacuna does not turn a static curated sample into a market census.",
      "Lacuna does not turn AI opportunity framing into an AI performance claim.",
      "Lacuna does not turn a polished dashboard into evidence that does not exist.",
    ]);
  });

  it("does not score commercialization from stage or exits", () => {
    const file = source("src/components/CommercializationReadiness.tsx");
    expect(file).not.toContain("calculateReadiness");
    expect(file).not.toContain("overallScore");
    expect(file).not.toContain("clinical validation");
    expect(file).toContain("ResearchIntegrityNote");
  });

  it("does not render registry lookups as maturity scores", () => {
    const file = source("src/components/EvidenceMaturityDashboard.tsx");
    expect(file).not.toContain("computeEvidenceMaturity");
    expect(file).not.toContain("premiumMultiple");
    expect(file).not.toContain("publicationScore");
    expect(file).not.toContain("resolveEvidenceInputs");
    expect(file).toContain("not recorded as zero");
  });

  it("does not render acquisition likelihood from historical overlap", () => {
    const file = source("src/components/AcquirerPredictionDashboard.tsx");
    expect(file).not.toContain("matchScore");
    expect(file).not.toContain("AIInsightsPanel");
    expect(file).not.toContain("Interest Level");
    expect(file).not.toContain('|| "low"');
    expect(file).not.toContain("|| 0");
  });
});
