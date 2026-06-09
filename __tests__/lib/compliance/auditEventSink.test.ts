import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hashAuditActor,
  sanitizeAuditResource,
  setAuditClickHouseClient,
  writeAuditEvent,
} from "@/lib/compliance/auditEventSink";

describe("auditEventSink", () => {
  afterEach(() => {
    setAuditClickHouseClient(null);
    delete process.env.LACUNA_AUDIT_SALT;
    delete process.env.CLICKHOUSE_URL;
  });

  it("hashes actor IP and never returns raw value (success)", () => {
    const hashed = hashAuditActor("203.0.113.10");
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain("203.0.113.10");
    expect(hashAuditActor("203.0.113.10")).toBe(hashed);
  });

  it("redacts VCF paths and sample identifiers from resource (edge)", () => {
    expect(sanitizeAuditResource("genomics/callsets/object")).toBe(
      "genomics/callsets/object",
    );
    expect(sanitizeAuditResource("s3://bucket/study/sample.vcf.gz")).toBe(
      "genomics/[redacted]",
    );
    expect(sanitizeAuditResource("sample_id=PATIENT-001")).toBe(
      "genomics/[redacted]",
    );
  });

  it("writes audit row through injected ClickHouse client (success)", async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    setAuditClickHouseClient({
      insert,
      close: vi.fn(),
    } as never);

    const ok = await writeAuditEvent({
      timestamp: "2026-06-09T12:00:00.000Z",
      action: "read_summary",
      resource: "genomics/variants",
      actor: "198.51.100.4",
      allowed: 1,
      mode: "de_identified",
    });

    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledOnce();
    const payload = insert.mock.calls[0]?.[0] as {
      values: Array<Record<string, unknown>>;
    };
    expect(payload.values[0]?.actor_hash).toHaveLength(64);
    expect(payload.values[0]?.resource).toBe("genomics/variants");
    expect(JSON.stringify(payload.values[0])).not.toMatch(/\.vcf|sample_id/i);
  });

  it("returns false when ClickHouse is not configured (edge)", async () => {
    const ok = await writeAuditEvent({
      timestamp: "2026-06-09T12:00:00.000Z",
      action: "download_raw",
      resource: "genomics/callsets/object",
      actor: "10.0.0.1",
      allowed: 0,
      mode: "de_identified",
    });
    expect(ok).toBe(false);
  });
});
