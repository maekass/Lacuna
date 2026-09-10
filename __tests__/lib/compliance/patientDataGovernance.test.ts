import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/compliance/auditEventSink", () => ({
  writeAuditEvent: vi.fn().mockResolvedValue(true),
  isAuditSinkConfigured: vi.fn().mockReturnValue(false),
}));

import {
  isAuditSinkConfigured,
  writeAuditEvent,
} from "@/lib/compliance/auditEventSink";
import {
  auditPatientDataAccess,
  getPatientDataAccessMode,
  isPatientDataAuthorized,
  pseudonymizeSampleId,
  redactCallsetFields,
  requireIngestConsentRef,
  requirePatientDataAccess,
} from "@/lib/compliance/patientDataGovernance";

const ENV_KEYS = [
  "LACUNA_PATIENT_DATA_MODE",
  "LACUNA_PATIENT_DATA_API_KEY",
  "LACUNA_INGEST_CONSENT_REF",
  "LACUNA_ALLOW_UNAUDITED_PHI",
] as const;

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("patientDataGovernance", () => {
  afterEach(() => {
    clearEnv();
    vi.mocked(isAuditSinkConfigured).mockReturnValue(false);
    vi.mocked(writeAuditEvent).mockResolvedValue(true);
  });

  it("defaults to de_identified when mode unset (success)", () => {
    clearEnv();
    expect(getPatientDataAccessMode()).toBe("de_identified");
  });

  it("blocks raw VCF download in de_identified mode (error)", async () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "de_identified";
    const request = new Request(
      "http://localhost/api/genomics/callsets/x/object",
    );
    const denied = await requirePatientDataAccess(
      request,
      "download_raw",
      "genomics/callsets/object",
    );
    expect(denied?.status).toBe(403);
  });

  it("allows variant summaries in de_identified mode (success)", async () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "de_identified";
    const request = new Request("http://localhost/api/genomics/variants");
    expect(
      await requirePatientDataAccess(
        request,
        "read_summary",
        "genomics/variants",
      ),
    ).toBeNull();
  });

  it("authorizes bearer token for raw download when configured (success)", async () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "authorized";
    process.env.LACUNA_PATIENT_DATA_API_KEY = "test-secret-key";
    vi.mocked(isAuditSinkConfigured).mockReturnValue(true);
    vi.mocked(writeAuditEvent).mockResolvedValue(true);
    const request = new Request(
      "http://localhost/api/genomics/callsets/x/object",
      {
        headers: { Authorization: "Bearer test-secret-key" },
      },
    );
    expect(isPatientDataAuthorized(request)).toBe(true);
    expect(
      await requirePatientDataAccess(
        request,
        "download_raw",
        "genomics/callsets/object",
      ),
    ).toBeNull();
  });

  it("denies privileged access when no audit sink is configured (error)", async () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "authorized";
    process.env.LACUNA_PATIENT_DATA_API_KEY = "test-secret-key";
    vi.mocked(isAuditSinkConfigured).mockReturnValue(false);
    const request = new Request(
      "http://localhost/api/genomics/callsets/x/object",
      {
        headers: { Authorization: "Bearer test-secret-key" },
      },
    );
    const denied = await requirePatientDataAccess(
      request,
      "download_raw",
      "genomics/callsets/object",
    );
    expect(denied?.status).toBe(503);
  });

  it("allows privileged access without a sink only when unaudited PHI is opted in (edge)", async () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "authorized";
    process.env.LACUNA_PATIENT_DATA_API_KEY = "test-secret-key";
    process.env.LACUNA_ALLOW_UNAUDITED_PHI = "1";
    vi.mocked(isAuditSinkConfigured).mockReturnValue(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new Request(
      "http://localhost/api/genomics/callsets/x/object",
      {
        headers: { Authorization: "Bearer test-secret-key" },
      },
    );
    expect(
      await requirePatientDataAccess(
        request,
        "download_raw",
        "genomics/callsets/object",
      ),
    ).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("redacts sample identifiers in de_identified responses (success)", () => {
    const redacted = redactCallsetFields(
      {
        sampleId: "PATIENT-001",
        objectUri: "s3://bucket/cohort.vcf.gz",
        notes: "clinical",
      },
      "de_identified",
    );
    expect(redacted.sampleId).toMatch(/^SAMPLE-\d{6}$/);
    expect(redacted.objectUri).toBe("");
    expect(redacted.notes).toContain("redacted");
  });

  it("pseudonymizeSampleId is stable for the same input (edge)", () => {
    expect(pseudonymizeSampleId("ABC")).toBe(pseudonymizeSampleId("ABC"));
    expect(pseudonymizeSampleId("ABC")).not.toBe(pseudonymizeSampleId("XYZ"));
  });

  it("requires consent ref for non-demo ingest (error)", () => {
    clearEnv();
    expect(requireIngestConsentRef("cohort-a")).toMatch(
      /LACUNA_INGEST_CONSENT_REF/,
    );
  });

  it("waives consent for infrastructure seed study (edge)", () => {
    clearEnv();
    expect(requireIngestConsentRef("lacuna-infra-seed")).toBeNull();
  });

  it("auditPatientDataAccess persists through the audit sink (success)", async () => {
    vi.mocked(writeAuditEvent).mockClear();
    await auditPatientDataAccess({
      action: "read_summary",
      resource: "genomics/variants",
      actor: "127.0.0.1",
      allowed: true,
      mode: "de_identified",
    });
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "read_summary",
        resource: "genomics/variants",
        allowed: 1,
        mode: "de_identified",
      }),
    );
  });

  it("reports dropped audit events when a sink is configured (error)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(writeAuditEvent).mockResolvedValueOnce(false);
    vi.mocked(isAuditSinkConfigured).mockReturnValueOnce(true);

    await auditPatientDataAccess({
      action: "download_raw",
      resource: "genomics/callsets/object",
      actor: "127.0.0.1",
      allowed: true,
      mode: "authorized",
    });
    expect(consoleError).toHaveBeenCalled();

    expect(consoleError.mock.calls[0]?.[0]).toContain("patient-data-audit");
  });

  it("stays quiet when no sink is configured (edge)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(writeAuditEvent).mockResolvedValueOnce(false);
    vi.mocked(isAuditSinkConfigured).mockReturnValueOnce(false);

    await auditPatientDataAccess({
      action: "read_summary",
      resource: "genomics/variants",
      actor: "127.0.0.1",
      allowed: true,
      mode: "de_identified",
    });

    expect(consoleError).not.toHaveBeenCalled();
  });
});
