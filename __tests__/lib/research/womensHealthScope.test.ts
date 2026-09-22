import { describe, expect, it } from "vitest";
import {
  BURDEN_CAPITAL_OPPORTUNITY_DISCLOSURE,
  COMPLEMENTARY_SOURCE_UNIVERSE_NOTE,
  DETERMINISTIC_COMPARISON_BOUNDARY,
  DIAGNOSTICS_TOOLS_SECTOR_CONTEXT,
  SVB_H2_2026_SOURCE,
  SVB_STATE_OF_THE_MARKETS_H2_2026_URL,
} from "@/lib/research/evidenceBoundaries";
import { LACUNA_SAMPLE_BOUNDARY_NOTE } from "@/lib/data/lacunaDataset";
import {
  getWomensHealthRelevanceMeta,
  listWomensHealthRelevance,
  WHAM_BUSINESS_CASE_SOURCE,
  WOMENS_HEALTH_RELEVANCE_ORDER,
} from "@/lib/research/womensHealthScope";

const DEFINITIONS = {
  exclusive: "A condition uniquely affecting women.",
  disproportionate: "Women have higher prevalence, severity, or burden.",
  differential:
    "Women have distinct biology, presentation, treatment response, or care pathway.",
  "multi-category": "More than one category applies.",
  adjacent:
    "Relevant to the women's-health ecosystem but not yet supported as sex-specific.",
  unclassified: "Not yet reviewed.",
} as const;

describe("womensHealthScope", () => {
  it("lists every relevance term once, without classifying deals", () => {
    const listed = listWomensHealthRelevance();
    expect(listed.map((meta) => meta.relevance)).toEqual([
      ...WOMENS_HEALTH_RELEVANCE_ORDER,
    ]);
    expect(new Set(listed.map((meta) => meta.relevance)).size).toBe(6);
  });

  it("keeps WHAM citation metadata and the supplied definitions", () => {
    for (const relevance of WOMENS_HEALTH_RELEVANCE_ORDER) {
      const meta = getWomensHealthRelevanceMeta(relevance);
      expect(meta.shortDefinition).toBe(DEFINITIONS[relevance]);
      expect(meta.sourceLabel).toBe(WHAM_BUSINESS_CASE_SOURCE.label);
      expect(meta.sourceUrl).toBe(WHAM_BUSINESS_CASE_SOURCE.url);
      expect(meta.sourceUrl).toContain("whamnow.org");
      expect(meta.localSourceMetadata).toBe(
        WHAM_BUSINESS_CASE_SOURCE.localSourceMetadata,
      );
      expect(meta.methodologyNote.length).toBeGreaterThan(0);
      expect(meta.intendedUse.length).toBeGreaterThan(0);
    }
  });

  it("keeps the evidence-scope boundary sentences exact", () => {
    expect(DETERMINISTIC_COMPARISON_BOUNDARY).toBe(
      "These outputs are deterministic, descriptive comparisons built from a curated public-source sample. They are not fitted predictive models, calibrated acquisition probabilities, company valuations, or investment recommendations.",
    );
    expect(BURDEN_CAPITAL_OPPORTUNITY_DISCLOSURE).toBe(
      "This view compares sourced population-level burden and historical funding context. It is a transparent research heuristic for identifying diligence questions; it does not estimate enterprise value, clinical benefit, commercial success, investment returns, or probability of exit.",
    );
    expect(COMPLEMENTARY_SOURCE_UNIVERSE_NOTE).toBe(
      "These sources are complementary context sets and are not directly comparable as counts, values, returns, or coverage universes.",
    );
    expect(DIAGNOSTICS_TOOLS_SECTOR_CONTEXT).toBe(
      "Diagnostics and tools can address high-value clinical gaps, but reimbursement, adoption, clinical utility, and commercialization evidence remain key diligence considerations.",
    );
    expect(LACUNA_SAMPLE_BOUNDARY_NOTE).toBe(
      "Lacuna is a curated public-source sample, not a census of women's-health M&A. Coverage varies by sector, geography, disclosure availability, and women's-health scope. Undisclosed transaction values are excluded from disclosed-value totals.",
    );
    expect(SVB_H2_2026_SOURCE.sourceUrl).toContain(
      "healthcare-investments-and-exits",
    );
    expect(SVB_STATE_OF_THE_MARKETS_H2_2026_URL).toContain(
      "state-of-the-markets-report",
    );
  });
});
