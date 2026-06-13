import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/genomics/ingest/route";

describe("POST /api/genomics/ingest", () => {
  it("returns 501 with worker documentation link (edge)", async () => {
    const response = await POST();
    expect(response.status).toBe(501);
    const body = await response.json() as { docs: string; worker: string };
    expect(body.docs).toBe("docs/INGEST_WORKER.md");
    expect(body.worker).toContain("ingest-worker");
  });
});
