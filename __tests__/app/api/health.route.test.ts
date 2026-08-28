import { describe, expect, it, vi } from "vitest";
import { GET as getLive } from "@/app/api/health/route";
import { GET as getReady } from "@/app/api/health/ready/route";
import packageJson from "../../../package.json";

vi.mock("@/lib/data/dbClient", () => ({
  query: vi.fn(),
}));

describe("health API", () => {
  it("liveness returns 200 without loading dataset (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    const response = await getLive();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.probe).toBe("live");
    expect(body.version).toBe(packageJson.version);
    expect(body.checks).toBeUndefined();
    expect(typeof body.droppedAuditEvents).toBe("number");
    expect(body.droppedAuditEvents).toBeGreaterThanOrEqual(0);
  });

  it("readiness returns dataset counts in static mode (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    vi.stubEnv("DATABASE_URL", "");

    const response = await getReady();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.probe).toBe("ready");
    expect(body.version).toBe(packageJson.version);
    expect(body.checks.dataset.companies).toBeGreaterThan(0);
    expect(body.checks.dataset.acquisitions).toBeGreaterThan(0);
    expect(body.checks.database.configured).toBe(false);
    expect(body.checks.variantStore.enabled).toBe(false);
    expect(body.checks.variantStore.ok).toBe(true);
  });

  it("readiness stays 200 in static mode when optional database is down", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    vi.stubEnv("DATABASE_URL", "postgresql://x@ep-stale.neon.tech/db");
    const { query } = await import("@/lib/data/dbClient");
    vi.mocked(query).mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND ep-stale.neon.tech"),
    );

    const response = await getReady();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checks.database.configured).toBe(true);
    expect(body.checks.database.ok).toBe(false);
    expect(body.checks.database.error).toContain("ENOTFOUND");
  });

  it("readiness returns 503 in db mode when the database is down", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "db");
    vi.stubEnv("DATABASE_URL", "postgresql://x@ep-stale.neon.tech/db");
    const { query } = await import("@/lib/data/dbClient");
    vi.mocked(query).mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND ep-stale.neon.tech"),
    );

    const response = await getReady();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
  });
});
