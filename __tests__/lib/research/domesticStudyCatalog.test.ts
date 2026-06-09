import { describe, expect, it } from "vitest";
import {
  computeStudySampleStats,
  DOMESTIC_RESEARCH_STUDIES,
  filterDomesticStudies,
} from "@/lib/research/domesticStudyCatalog";

describe("DOMESTIC_RESEARCH_STUDIES", () => {
  it("includes NIH, Harvard, and MIT/Broad studies (success)", () => {
    const institutions = new Set(
      DOMESTIC_RESEARCH_STUDIES.map((s) => s.institution),
    );
    expect(institutions.has("nih")).toBe(true);
    expect(institutions.has("harvard")).toBe(true);
    expect(institutions.has("mit") || institutions.has("harvard_mit_collab")).toBe(
      true,
    );
  });

  it("aggregates sample sizes above 1M combined (success)", () => {
    const stats = computeStudySampleStats();
    expect(stats.totalStudies).toBeGreaterThanOrEqual(10);
    expect(stats.totalSampleSize).toBeGreaterThan(1_000_000);
    expect(stats.byInstitution.nih.sampleSize).toBeGreaterThan(500_000);
  });

  it("filters by institution NIH (edge)", () => {
    const page = filterDomesticStudies({
      institution: "nih",
      limit: 50,
      offset: 0,
    });
    expect(page.studies.length).toBeGreaterThan(0);
    expect(page.studies.every((s) => s.institution === "nih")).toBe(true);
  });

  it("filters by sickle cell condition keyword (edge)", () => {
    const page = filterDomesticStudies({
      condition: "sickle",
      limit: 10,
      offset: 0,
    });
    expect(page.studies.some((s) => s.studyId === "nih-scd-initiative")).toBe(
      true,
    );
  });
});
