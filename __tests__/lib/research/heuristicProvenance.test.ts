import { describe, expect, it } from "vitest";
import { HEALTH_EQUITY_FOCUS_AREAS } from "@/lib/impact/healthEquityFocusAreas";
import { DOMESTIC_RESEARCH_STUDIES } from "@/lib/research/domesticStudyCatalog";
import { PATIENT_EMPOWERMENT_METRICS } from "@/data/patientEmpowermentReport";
import { EMPOWERMENT_MATCH_TIER_LABELS } from "@/lib/research/patientEmpowermentTaxonomy";
import {
  isAllowedResearchContextTier,
  isCitedOrAffinityTier,
  labelResearchContextTier,
  RESEARCH_HEURISTIC_DISCLAIMER,
} from "@/lib/research/heuristicProvenance";

describe("heuristicProvenance", () => {
  it("accepts cited_* and affinity labels", () => {
    expect(isCitedOrAffinityTier("cited_survey_2022")).toBe(true);
    expect(isCitedOrAffinityTier("cited_epidemiology")).toBe(true);
    expect(isCitedOrAffinityTier("cited_public")).toBe(true);
    expect(isCitedOrAffinityTier("affinity")).toBe(true);
    expect(isCitedOrAffinityTier("heuristic_affinity")).toBe(true);
    expect(isCitedOrAffinityTier("illustrative_static")).toBe(false);
    expect(isCitedOrAffinityTier("deal_economics")).toBe(false);
  });

  it("allows illustrative/derived context on research pages", () => {
    expect(isAllowedResearchContextTier("illustrative_static")).toBe(true);
    expect(isAllowedResearchContextTier("derived_static")).toBe(true);
    expect(isAllowedResearchContextTier("dual_source")).toBe(false);
  });

  it("labels research catalogs with cited_* / affinity / honest context", () => {
    for (const metric of PATIENT_EMPOWERMENT_METRICS) {
      expect(isAllowedResearchContextTier(metric.dataTier)).toBe(true);
    }
    for (const area of HEALTH_EQUITY_FOCUS_AREAS) {
      expect(isAllowedResearchContextTier(area.dataTier)).toBe(true);
    }
    for (const study of DOMESTIC_RESEARCH_STUDIES) {
      expect(isAllowedResearchContextTier(study.dataTier)).toBe(true);
    }
    expect(RESEARCH_HEURISTIC_DISCLAIMER).toMatch(/deal economics/);
    expect(RESEARCH_HEURISTIC_DISCLAIMER).toMatch(/dual-source/);
  });

  it("formats cited_* / affinity / context labels for research UI", () => {
    expect(labelResearchContextTier("cited_survey_2022")).toBe(
      "Cited (survey 2022)",
    );
    expect(labelResearchContextTier("affinity")).toBe("Affinity (heuristic)");
    expect(labelResearchContextTier("heuristic_affinity")).toBe(
      "Portfolio crosswalk (heuristic)",
    );
    expect(labelResearchContextTier("illustrative_static")).toBe(
      "Illustrative context",
    );
    expect(EMPOWERMENT_MATCH_TIER_LABELS.sector).toMatch(/Affinity/);
    expect(EMPOWERMENT_MATCH_TIER_LABELS.keyword).toMatch(/Affinity/);
    expect(EMPOWERMENT_MATCH_TIER_LABELS.curated).not.toMatch(/Affinity/);
  });
});
