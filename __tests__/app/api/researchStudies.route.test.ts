import { describe, expect, it } from "vitest";

describe("GET /api/research/studies", () => {
  it("returns domestic catalog with stats (success)", async () => {
    const { GET } = await import("@/app/api/research/studies/route");
    const response = await GET(
      new Request("http://localhost/api/research/studies?limit=5"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.studies.length).toBeLessThanOrEqual(5);
    expect(body.stats.totalStudies).toBeGreaterThan(0);
    expect(body.stats.byInstitution.nih).toBeDefined();
  });

  it("filters by harvard institution (edge)", async () => {
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
});
