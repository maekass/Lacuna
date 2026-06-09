import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/research/loadResearchStudiesFromDb", () => ({
  loadResearchStudiesPage: vi.fn(),
  computeResearchStudyStatsFromDb: vi.fn(),
}));

describe("researchStudyProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("uses static catalog when LACUNA_DATA_MODE is unset (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    const { getResearchStudyPage } = await import(
      "@/lib/research/researchStudyProvider"
    );
    const page = await getResearchStudyPage({
      limit: 5,
      offset: 0,
      institution: "nih",
    });
    expect(page.dataMode).toBe("static");
    expect(page.studies.length).toBeGreaterThan(0);
    expect(page.studies.every((s) => s.institution === "nih")).toBe(true);
  });

  it("queries Postgres when LACUNA_DATA_MODE=db (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "db");
    const { loadResearchStudiesPage, computeResearchStudyStatsFromDb } =
      await import("@/lib/research/loadResearchStudiesFromDb");
    vi.mocked(loadResearchStudiesPage).mockResolvedValue({
      studies: [
        {
          studyId: "nih-scd-initiative",
          institution: "nih",
          sampleSize: 7_500,
          source: "NHLBI SCD",
          markerGenes: ["HBB"],
        },
      ],
      total: 1,
    });
    vi.mocked(computeResearchStudyStatsFromDb).mockResolvedValue({
      totalStudies: 1,
      totalSampleSize: 7_500,
      byInstitution: {
        nih: { studies: 1, sampleSize: 7_500 },
        harvard: { studies: 0, sampleSize: 0 },
        mit: { studies: 0, sampleSize: 0 },
        harvard_mit_collab: { studies: 0, sampleSize: 0 },
      },
    });

    const { getResearchStudyPage } = await import(
      "@/lib/research/researchStudyProvider"
    );
    const page = await getResearchStudyPage({
      limit: 10,
      offset: 0,
      condition: "sickle",
    });

    expect(page.dataMode).toBe("db");
    expect(loadResearchStudiesPage).toHaveBeenCalledWith(
      expect.objectContaining({ condition: "sickle" }),
    );
    expect(page.studies[0]?.title).toContain("Sickle");
  });
});
