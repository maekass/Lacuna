import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/data/dbClient";
import { GET as getLive } from "@/app/api/health/route";
import {
  getDroppedAuditCount,
  resetDroppedAuditCount,
} from "@/lib/compliance/droppedAuditCounter";
import {
  setAuditClickHouseClient,
  writeAuditEvent,
} from "@/lib/compliance/auditEventSink";
import { requirePatientDataAccess } from "@/lib/compliance/patientDataGovernance";

vi.mock("@/lib/data/dbClient", () => ({
  query: vi.fn(),
}));

const ENV_KEYS = [
  "DATABASE_URL",
  "CLICKHOUSE_URL",
  "LACUNA_PATIENT_DATA_MODE",
  "LACUNA_PATIENT_DATA_API_KEY",
] as const;

function failingClickHouse(message = "ClickHouse unavailable") {
  return {
    insert: vi.fn().mockRejectedValue(new Error(message)),
    close: vi.fn(),
  } as never;
}

function privilegedRawRequest(): Request {
  return new Request("http://localhost/api/genomics/callsets/x/object", {
    headers: { Authorization: "Bearer test-secret-key" },
  });
}

function anonymousSummaryRequest(): Request {
  return new Request("http://localhost/api/genomics/variants");
}

describe("audit trail failover", () => {
  beforeEach(() => {
    resetDroppedAuditCount();
    setAuditClickHouseClient(null);
    vi.mocked(query).mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    resetDroppedAuditCount();
    setAuditClickHouseClient(null);
    for (const key of ENV_KEYS) delete process.env[key];
    vi.restoreAllMocks();
  });

  it("falls back to Postgres when ClickHouse is down and Postgres is up (success)", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/lacuna";
    setAuditClickHouseClient(failingClickHouse());
    vi.mocked(query).mockResolvedValue([]);

    const ok = await writeAuditEvent({
      timestamp: "2026-06-09T12:00:00.000Z",
      action: "read_summary",
      resource: "genomics/variants",
      actor: "198.51.100.4",
      allowed: 1,
      mode: "de_identified",
    });

    expect(ok).toBe(true);
    expect(query).toHaveBeenCalledOnce();
    expect(getDroppedAuditCount()).toBe(0);
  });

  it("denies privileged access with 503 when both sinks are down (error)", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/lacuna";
    process.env.LACUNA_PATIENT_DATA_MODE = "authorized";
    process.env.LACUNA_PATIENT_DATA_API_KEY = "test-secret-key";
    setAuditClickHouseClient(failingClickHouse());
    vi.mocked(query).mockRejectedValue(new Error("Postgres unavailable"));

    const denied = await requirePatientDataAccess(
      privilegedRawRequest(),
      "download_raw",
      "genomics/callsets/object",
    );

    expect(denied?.status).toBe(503);
    const body = await denied?.json() as { error?: string };
    expect(body.error).toBe("Audit trail unavailable");
    expect(getDroppedAuditCount()).toBeGreaterThan(0);
    expect(console.error).toHaveBeenCalled();
  });

  it("lets anonymous/redacted reads proceed and counts dropped audits in /api/health (edge)", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/lacuna";
    process.env.LACUNA_PATIENT_DATA_MODE = "de_identified";
    setAuditClickHouseClient(failingClickHouse());
    vi.mocked(query).mockRejectedValue(new Error("Postgres unavailable"));

    const denied = await requirePatientDataAccess(
      anonymousSummaryRequest(),
      "read_summary",
      "genomics/variants",
    );

    expect(denied).toBeNull();
    expect(getDroppedAuditCount()).toBe(1);

    const response = await getLive();
    const body = await response.json() as { droppedAuditEvents?: number };
    expect(response.status).toBe(200);
    expect(body.droppedAuditEvents).toBe(1);
  });
});
