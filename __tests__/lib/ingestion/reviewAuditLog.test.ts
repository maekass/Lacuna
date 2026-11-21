import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("@/lib/data/dbClient", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

describe("reviewAuditLog", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    // Synthetic test key; the audit writer refuses to run without one.
    vi.stubEnv(
      "LACUNA_FIELD_ENCRYPTION_KEYS",
      `k1:${Buffer.alloc(32, 3).toString("base64")}`,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    const insertedActor = String(mockQuery.mock.calls[0]?.[1]?.[2]);
    expect(insertedActor.startsWith("enc:v1:k1:")).toBe(true);
    expect(insertedActor).not.toContain("maekass");
  });

  it("swallows insert failures in tryLogReviewAction (error)", async () => {
    mockQuery.mockRejectedValueOnce(new Error("relation missing"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { tryLogReviewAction } = await import(
      "@/lib/ingestion/reviewAuditLog"
    );
    await expect(tryLogReviewAction({
      action: "session_start",
      actorId: "github:maekass",
      actorMethod: "github",
    })).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
