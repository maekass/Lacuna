import { beforeEach, describe, expect, it, vi } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";

vi.mock("@/lib/data/datasetProvider", () => ({
  getVerifiedDataset: vi.fn(),
  getVerifiedDatasetPage: vi.fn(),
}));

describe("dataset verified API", () => {
  beforeEach(async () => {
    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    vi.mocked(getVerifiedDataset).mockReset();
    vi.mocked(getVerifiedDataset).mockResolvedValue(minimalVerifiedDataset);
  });

  it("GET returns verified dataset JSON (success)", async () => {
    const { GET } = await import("@/app/api/dataset/verified/route");
    const response = await GET(
      new Request("http://localhost/api/dataset/verified"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companies).toHaveLength(2);
    expect(body.acquisitions[0].id).toBe("deal7");
  });

  it("GET returns paginated slice when limit is provided (success)", async () => {
    const { getVerifiedDatasetPage } = await import(
      "@/lib/data/datasetProvider"
    );
    vi.mocked(getVerifiedDatasetPage).mockResolvedValue({
      provenance: minimalVerifiedDataset.provenance,
      companies: minimalVerifiedDataset.companies.slice(0, 1),
      acquirers: [],
      acquisitions: [],
      meta: {
        resource: "companies",
        limit: 1,
        offset: 0,
        genomics: true,
        total: { companies: 2, acquisitions: 1, acquirers: 1 },
      },
    });

    const { GET } = await import("@/app/api/dataset/verified/route");
    const response = await GET(
      new Request(
        "http://localhost/api/dataset/verified?resource=companies&limit=1&genomics=true",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companies).toHaveLength(1);
    expect(body.meta.genomics).toBe(true);
  });

  it("GET propagates provider errors (error)", async () => {
    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    vi.mocked(getVerifiedDataset).mockRejectedValue(new Error("db down"));

    const { GET } = await import("@/app/api/dataset/verified/route");
    await expect(GET(new Request("http://localhost/api/dataset/verified")))
      .rejects.toThrow("db down");
  });
});

describe("dataset summary API", () => {
  beforeEach(async () => {
    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    vi.mocked(getVerifiedDataset).mockReset();
    vi.mocked(getVerifiedDataset).mockResolvedValue(minimalVerifiedDataset);
    vi.stubEnv("DATABASE_URL", "");
  });

  it("GET returns headline stats from the verified dataset (success)", async () => {
    const { GET } = await import("@/app/api/dataset/summary/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.headline.verifiedDeals).toBe(1);
    expect(body.pipelines.secIngestLastRunAt).toBeNull();
  });
});

describe("deals.csv export API", () => {
  beforeEach(async () => {
    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    vi.mocked(getVerifiedDataset).mockReset();
    vi.mocked(getVerifiedDataset).mockResolvedValue(minimalVerifiedDataset);
  });

  it("GET returns CSV with escaped fields (success)", async () => {
    const { GET } = await import("@/app/api/export/deals.csv/route");
    const response = await GET();
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv.split("\n")[0]).toContain("announcedDate");
    expect(csv).toContain('"Biotheranostics"');
    expect(csv).toContain("230");
  });

  it("GET handles missing optional deal fields (edge)", async () => {
    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    vi.mocked(getVerifiedDataset).mockResolvedValue({
      ...minimalVerifiedDataset,
      acquisitions: [
        {
          ...minimalVerifiedDataset.acquisitions[0],
          closedDate: undefined,
          dealValue: undefined,
          dealValueNote: undefined,
          source: undefined,
        },
      ],
    });

    const { GET } = await import("@/app/api/export/deals.csv/route");
    const csv = await (await GET()).text();
    const dataRow = csv.split("\n")[1];
    expect(dataRow).toContain('"deal7"');
    expect(dataRow).not.toContain("undefined");
  });
});
