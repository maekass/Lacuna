import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  getResearchSourceById,
  PRIMARY_SOURCE_TYPES,
  RESEARCH_SOURCES,
} from "@/lib/research/sourceRegistry";

const PRIMARY = new Set<string>(PRIMARY_SOURCE_TYPES);

describe("sourceRegistry", () => {
  it("keeps source ids unique and metadata complete", () => {
    const ids = RESEARCH_SOURCES.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "hologic-announcement-filing",
      "hologic-completion-filing",
      "bci-product-description",
      "b42-study",
      "wham-business-case-2026",
      "svb-healthcare-investments-exits-h2-2026",
      "aoa-dx-follow-the-exits-2026",
      "mckinsey-womens-health-gap-2024",
      "mckinsey-blueprint-womens-health-gap-2025",
      "lux-ai-womens-health-2025",
      "amboy-ghost-market-2025",
      "camber-ief-opportunity-map-progress-2025",
      "lacuna-curated-ma-dataset",
    ]);

    for (const source of RESEARCH_SOURCES) {
      expect(source.publisher.length).toBeGreaterThan(0);
      expect(source.title.length).toBeGreaterThan(0);
      expect(source.publishedAt.length).toBeGreaterThan(0);
      expect(source.sourceUrl.startsWith("https://")).toBe(true);
      expect(source.sourceUrl.toLowerCase().endsWith(".pdf")).toBe(false);
      expect(source.geographicScope.length).toBeGreaterThan(0);
      expect(source.methodologySummary.length).toBeGreaterThan(0);
      expect(source.limitations.length).toBeGreaterThan(0);
      expect(source.approvedUses.length).toBeGreaterThan(0);
      expect(source.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (!PRIMARY.has(source.sourceType)) {
        expect(source.prohibitedUses.length).toBeGreaterThan(0);
      }
    }
  });

  it("looks up canonical sources and follows dataset provenance", () => {
    const svb = getResearchSourceById(
      "svb-healthcare-investments-exits-h2-2026",
    );
    expect(svb?.dataCutoff).toBe("June 30, 2026");
    expect(svb?.sourceUrl).toBe(
      "https://www.svb.com/trends-insights/reports/healthcare-investments-and-exits/",
    );
    expect(svb?.prohibitedUses).toContain("company_ranking");
    expect(svb?.prohibitedUses).toContain("valuation_input");

    const camber = getResearchSourceById(
      "camber-ief-opportunity-map-progress-2025",
    );
    expect(camber?.approvedUses).toEqual([
      "taxonomy",
      "research_gap_framing",
      "commercialization_context",
    ]);
    expect(camber?.prohibitedUses).toEqual(
      expect.arrayContaining([
        "company_ranking",
        "valuation_input",
        "predictive_model_input",
        "causal_inference",
      ]),
    );

    const provenance = getStaticVerifiedDataset().provenance;
    const lacuna = getResearchSourceById("lacuna-curated-ma-dataset");
    expect(lacuna?.publishedAt).toBe(
      `${provenance.datasetVersion} · updated ${provenance.lastUpdated}`,
    );
    expect(lacuna?.sourceType).toBe("lacuna_dataset");
    expect(getResearchSourceById("missing")).toBeUndefined();
  });
});
