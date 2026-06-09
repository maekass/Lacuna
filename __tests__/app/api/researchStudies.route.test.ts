import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/research/loadResearchStudiesFromDb", () => ({
  loadResearchStudiesPage: vi.fn(),
  computeResearchStudyStatsFromDb: vi.fn(),
}));

vi.mock("@/lib/research/studyLinkage", () => ({
  getStudyLinkageMap: vi.fn().mockResolvedValue(new Map()),
}));

describe("GET /api/research/studies", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns domestic catalog with stats in static mode (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    const { GET } = await import("@/app/api/research/studies/route");
    const response = await GET(
      new Request("http://localhost/api/research/studies?limit=5"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataMode).toBe("static");
    expect(body.studies.length).toBeLessThanOrEqual(5);
    expect(body.stats.totalStudies).toBeGreaterThan(0);
    expect(body.stats.byInstitution.nih).toBeDefined();
  });

  it("filters by harvard institution in static mode (edge)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    const { GET } = await import("@/app/api/research/studies/route");
    const response = await GET(
      new Request("http://localhost/api/research/studies?institution=harvard"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.studies.every((s: { institution: string }) =>
      s.institution === "harvard"
    )).toBe(true);
  });

  it("loads from Postgres in db mode (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "db");
    const { loadResearchStudiesPage, computeResearchStudyStatsFromDb } =
      await import("@/lib/research/loadResearchStudiesFromDb");
    vi.mocked(loadResearchStudiesPage).mockResolvedValue({
      studies: [
        {
          studyId: "nih-whi",
          institution: "nih",
          sampleSize: 161_808,
          source: "NIH WHI",
          markerGenes: ["BRCA1"],
        },
      ],
      total: 1,
    });
    vi.mocked(computeResearchStudyStatsFromDb).mockResolvedValue({
      totalStudies: 1,
      totalSampleSize: 161_808,
      byInstitution: {
        nih: { studies: 1, sampleSize: 161_808 },
        harvard: { studies: 0, sampleSize: 0 },
        mit: { studies: 0, sampleSize: 0 },
        harvard_mit_collab: { studies: 0, sampleSize: 0 },
      },
    });

    const { GET } = await import("@/app/api/research/studies/route");
    const response = await GET(
      new Request("http://localhost/api/research/studies?institution=nih&limit=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataMode).toBe("db");
    expect(loadResearchStudiesPage).toHaveBeenCalledWith(
      expect.objectContaining({ institution: "nih", limit: 10 }),
    );
    expect(body.studies[0]?.studyId).toBe("nih-whi");
    expect(body.meta.total).toBe(1);
  });
});
