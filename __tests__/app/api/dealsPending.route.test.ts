import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingestion/pendingDeals", () => ({
  listPendingDeals: vi.fn(),
  updatePendingDeal: vi.fn(),
  getPendingDealByDealId: vi.fn(),
}));

vi.mock("@/lib/api/reviewAudit", () => ({
  auditReviewRequest: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/deals/pending", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("returns paginated pending deals in development", async () => {
    const { listPendingDeals } = await import("@/lib/ingestion/pendingDeals");
    vi.mocked(listPendingDeals).mockResolvedValue({
      items: [{
        id: 1,
        dealId: "sec-1",
        secAccession: "acc-1",
        acquirerName: "Buyer",
        acquirerTicker: null,
        acquirerCik: null,
        targetName: "Target",
        announcedDate: "2024-01-01",
        closedDate: null,
        dealValueMillions: null,
        dealValueNote: null,
        dealStructure: null,
        earnoutTerms: null,
        filingUrl: "https://www.sec.gov/example",
        filingDate: "2024-01-01",
        item201Excerpt: null,
        classificationConfidence: "medium",
        classificationKeywords: [],
        womensHealthRelevant: true,
        status: "pending",
        sicCode: null,
        parseQuality: "partial",
        ingestedAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        reviewNotes: null,
      }],
      meta: { limit: 20, offset: 0, total: 1, reviewableTotal: 1 },
    });

    const { GET } = await import("@/app/api/deals/pending/route");
    const response = await GET(
      new Request("http://localhost/api/deals/pending?limit=20"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.probe).toBe("pending-deals");
    expect(body.items).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it("returns 503 when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const { GET } = await import("@/app/api/deals/pending/route");
    const response = await GET(
      new Request("http://localhost/api/deals/pending"),
    );
    expect(response.status).toBe(503);
  });

  it("returns 401 in production without bearer token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CRON_SECRET", "test-secret");

    const { GET } = await import("@/app/api/deals/pending/route");
    const response = await GET(
      new Request("http://localhost/api/deals/pending"),
    );
    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/deals/pending/[dealId]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("updates pending deal status", async () => {
    const { updatePendingDeal } = await import("@/lib/ingestion/pendingDeals");
    vi.mocked(updatePendingDeal).mockResolvedValue({
      id: 1,
      dealId: "sec-1",
      secAccession: "acc-1",
      acquirerName: "Buyer",
      acquirerTicker: null,
      acquirerCik: null,
      targetName: "Target",
      announcedDate: "2024-01-01",
      closedDate: null,
      dealValueMillions: null,
      dealValueNote: null,
      dealStructure: null,
      earnoutTerms: null,
      filingUrl: "https://www.sec.gov/example",
      filingDate: "2024-01-01",
      item201Excerpt: null,
      classificationConfidence: "medium",
      classificationKeywords: [],
      womensHealthRelevant: true,
      status: "approved",
      sicCode: null,
      parseQuality: "partial",
      ingestedAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-03T00:00:00.000Z",
      mergedAcquisitionId: null,
      promotedAt: null,
      reviewNotes: "Verified",
    });

    const { PATCH } = await import("@/app/api/deals/pending/[dealId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/deals/pending/sec-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "approved", reviewNotes: "Verified" }),
      }),
      { params: Promise.resolve({ dealId: "sec-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.item.status).toBe("approved");
  });
});

describe("GET /api/deals/pending/[dealId]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("returns one pending deal", async () => {
    const { getPendingDealByDealId } = await import(
      "@/lib/ingestion/pendingDeals"
    );
    vi.mocked(getPendingDealByDealId).mockResolvedValue({
      id: 1,
      dealId: "sec-1",
      secAccession: "acc-1",
      acquirerName: "Buyer",
      acquirerTicker: null,
      acquirerCik: null,
      targetName: "Target",
      announcedDate: "2024-01-01",
      closedDate: null,
      dealValueMillions: null,
      dealValueNote: null,
      dealStructure: null,
      earnoutTerms: null,
      filingUrl: "https://www.sec.gov/example",
      filingDate: "2024-01-01",
      item201Excerpt: null,
      classificationConfidence: "medium",
      classificationKeywords: [],
      womensHealthRelevant: true,
      status: "pending",
      sicCode: null,
      parseQuality: "partial",
      ingestedAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      reviewNotes: null,
      mergedAcquisitionId: null,
      promotedAt: null,
    });

    const { GET } = await import("@/app/api/deals/pending/[dealId]/route");
    const response = await GET(
      new Request("http://localhost/api/deals/pending/sec-1"),
      { params: Promise.resolve({ dealId: "sec-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.probe).toBe("pending-deal-detail");
    expect(body.item.dealId).toBe("sec-1");
  });
});
