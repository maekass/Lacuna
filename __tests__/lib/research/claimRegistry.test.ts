import { describe, expect, it } from "vitest";
import {
  getClaimsBySourceId,
  getClaimsByType,
  getClaimsForUse,
  RESEARCH_CLAIMS,
} from "@/lib/research/claimRegistry";
import {
  getResearchSourceById,
  RESEARCH_SOURCE_IDS,
} from "@/lib/research/sourceRegistry";

const PREDICTION_EXCLUSIONS = [
  "predictive_model_input",
  "prediction",
  "return_forecast",
] as const;

const BANNED_CLAIM_TEXT = [
  /\$360\s*B/i,
  /\$1\s*T/i,
  /1\s*trillion/i,
  /wealth[- ]transfer/i,
  /\d+(?:\.\d+)?\s*%/,
];

describe("claimRegistry", () => {
  it("links every claim to a registered source", () => {
    expect(new Set(RESEARCH_CLAIMS.map((claim) => claim.id)).size).toBe(
      RESEARCH_CLAIMS.length,
    );
    for (const claim of RESEARCH_CLAIMS) {
      const source = getResearchSourceById(claim.sourceId);
      expect(source, claim.id).toBeDefined();
      expect(source?.id).toBe(claim.sourceId);
      expect(claim.claim.length).toBeGreaterThan(0);
      expect(claim.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps required scope on bounded report claims", () => {
    const capital = RESEARCH_CLAIMS.find(
      (claim) => claim.id === "svb-h1-2026-capital-concentration",
    );
    expect(capital?.scope.geography).toBe("US and Europe");
    expect(capital?.scope.period).toBe("H1 2026");
    expect(capital?.scope.methodologyBoundary).toMatch(/June 30, 2026/);

    const ecosystem = RESEARCH_CLAIMS.find(
      (claim) => claim.id === "camber-ief-ecosystem-constraints",
    );
    expect(ecosystem?.scope.geography).toMatch(/[Gg]lobal/);
    expect(ecosystem?.scope.methodologyBoundary).toMatch(/[Qq]ualitative/);

    const pathways = RESEARCH_CLAIMS.find(
      (claim) => claim.id === "camber-ief-market-pathways-separate-from-need",
    );
    expect(pathways?.scope.geography).toBe("Global");
    expect(pathways?.scope.population).toMatch(/LMIC/);

    const opportunityMap = RESEARCH_CLAIMS.find(
      (claim) => claim.id === "camber-ief-opportunity-map-not-a-measurement",
    );
    expect(opportunityMap?.scope.methodologyBoundary).toMatch(/illustrative/);
    expect(opportunityMap?.claim).not.toMatch(/\d+(?:\.\d+)?\s*%/);
  });

  it("blocks valuation and prediction on every report-derived claim", () => {
    for (const claim of RESEARCH_CLAIMS) {
      expect(claim.prohibitedUses, claim.id).toContain("valuation_input");
      expect(
        claim.prohibitedUses.some((use) =>
          (PREDICTION_EXCLUSIONS as readonly string[]).includes(use)
        ),
        claim.id,
      ).toBe(true);
      expect(claim.approvedUses, claim.id).not.toContain("valuation_input");
    }
  });

  it("omits dollar totals, wealth-transfer language, and raw progress percents", () => {
    for (const claim of RESEARCH_CLAIMS) {
      for (const pattern of BANNED_CLAIM_TEXT) {
        expect(claim.claim, claim.id).not.toMatch(pattern);
      }
    }
    expect(
      RESEARCH_CLAIMS.some((claim) =>
        /case study|portfolio company/i.test(claim.claim)
      ),
    ).toBe(false);
  });

  it("looks up claims by source, type, and approved use", () => {
    expect(getClaimsBySourceId(RESEARCH_SOURCE_IDS.wham2026)).toHaveLength(2);
    expect(getClaimsBySourceId(RESEARCH_SOURCE_IDS.svbH22026)).toHaveLength(3);
    expect(getClaimsBySourceId(RESEARCH_SOURCE_IDS.aoaDx2026)).toHaveLength(1);
    expect(getClaimsBySourceId(RESEARCH_SOURCE_IDS.camberIef2025)).toHaveLength(
      3,
    );
    expect(getClaimsBySourceId(RESEARCH_SOURCE_IDS.luxCapital2025))
      .toHaveLength(1);
    expect(getClaimsBySourceId("missing-source")).toEqual([]);

    expect(getClaimsByType("methodology_boundary").map((claim) => claim.id))
      .toEqual([
        "aoa-dx-separate-exit-research-universe",
        "camber-ief-opportunity-map-not-a-measurement",
      ]);
    expect(getClaimsByType("taxonomy")).toHaveLength(1);
    expect(getClaimsForUse("source_provenance").map((claim) => claim.sourceId))
      .toEqual([
        RESEARCH_SOURCE_IDS.aoaDx2026,
        RESEARCH_SOURCE_IDS.camberIef2025,
      ]);
    expect(getClaimsForUse("taxonomy")[0]?.sourceId).toBe(
      RESEARCH_SOURCE_IDS.wham2026,
    );
  });
});
