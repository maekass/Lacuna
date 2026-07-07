import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("@/lib/data/dbClient", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

describe("reviewAuditLog", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("inserts approve audit rows", async () => {
    mockQuery.mockResolvedValueOnce([{
      id: 1,
      deal_id: "sec-1",
      action: "approve",
      actor_id: "github:maekass",
      actor_method: "github",
      metadata: {},
      created_at: "2026-07-07T18:00:00.000Z",
    }]);

    const { logReviewAction } = await import(
      "@/lib/ingestion/reviewAuditLog"
    );
    const row = await logReviewAction({
      dealId: "sec-1",
      action: "approve",
      actorId: "github:maekass",
      actorMethod: "github",
    });

    expect(row.action).toBe("approve");
    expect(mockQuery.mock.calls[0]?.[0]).toContain(
      "INSERT INTO review_audit_log",
    );
  });
});
