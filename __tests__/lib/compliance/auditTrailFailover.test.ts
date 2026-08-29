import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@clickhouse/client";
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

vi.mock("@clickhouse/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clickhouse/client")>();
  return { ...actual, createClient: vi.fn() };
});

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
    vi.mocked(createClient).mockReset();
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
    const params = vi.mocked(query).mock.calls[0]?.[1] as unknown[];
    // 006_audit_events CHECK: action, resource_type, mode
    expect(params[1]).toBe("read");
    expect(params[2]).toBe("variant");
    expect(params[3]).toMatch(/^[a-f0-9]{64}$/);
    expect(params[3]).not.toBe("genomics/variants");
    expect(params[6]).toBe("development");
    expect(params[7]).toEqual(
      expect.objectContaining({
        action: "read_summary",
        mode: "de_identified",
        resource_hash: params[3],
      }),
    );
    expect(getDroppedAuditCount()).toBe(0);
  });

  it("falls back to Postgres when CLICKHOUSE_URL is malformed (error)", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/lacuna";
    process.env.CLICKHOUSE_URL = "not-a-valid-url";
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

  it("maps privileged HIPAA fields onto Postgres CHECK values (success)", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/lacuna";
    setAuditClickHouseClient(failingClickHouse());
    vi.mocked(query).mockResolvedValue([]);

    const ok = await writeAuditEvent({
      timestamp: "2026-06-09T12:00:00.000Z",
      action: "download_raw",
      resource: "genomics/callsets/object",
      actor: "198.51.100.4",
      allowed: 1,
      mode: "authorized",
    });

    expect(ok).toBe(true);
    const params = vi.mocked(query).mock.calls[0]?.[1] as unknown[];
    expect(params[1]).toBe("export");
    expect(params[2]).toBe("vcf_object");
    expect(params[3]).toMatch(/^[a-f0-9]{64}$/);
    expect(params[6]).toBe("production");
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
    const body = await response.json() as {
      droppedAuditEvents?: number;
      droppedAuditEventsScope?: string;
    };
    expect(response.status).toBe(200);
    expect(body.droppedAuditEvents).toBe(1);
    expect(body.droppedAuditEventsScope).toBe("process");
  });

  it("increments dropped-audit count when CLICKHOUSE_URL is malformed and Postgres is unset (error)", async () => {
    process.env.CLICKHOUSE_URL = "not-a-valid-url";

    const ok = await writeAuditEvent({
      timestamp: "2026-06-09T12:00:00.000Z",
      action: "read_summary",
      resource: "genomics/variants",
      actor: "198.51.100.4",
      allowed: 1,
      mode: "de_identified",
    });

    expect(ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
    expect(getDroppedAuditCount()).toBe(1);
  });

  it("increments dropped-audit count when createClient throws and Postgres is unset (error)", async () => {
    process.env.CLICKHOUSE_URL = "https://clickhouse.invalid:8443";
    vi.mocked(createClient).mockImplementation(() => {
      throw new Error("ClickHouse client init failed");
    });

    const ok = await writeAuditEvent({
      timestamp: "2026-06-09T12:00:00.000Z",
      action: "read_summary",
      resource: "genomics/variants",
      actor: "198.51.100.4",
      allowed: 1,
      mode: "de_identified",
    });

    expect(ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
    expect(getDroppedAuditCount()).toBe(1);
  });
});
