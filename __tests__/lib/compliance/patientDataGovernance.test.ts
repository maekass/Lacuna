import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/compliance/auditEventSink", () => ({
  writeAuditEvent: vi.fn().mockResolvedValue(true),
}));

import { writeAuditEvent } from "@/lib/compliance/auditEventSink";
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
] as const;

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("patientDataGovernance", () => {
  afterEach(() => {
    clearEnv();
  });

  it("defaults to de_identified when mode unset (success)", () => {
    clearEnv();
    expect(getPatientDataAccessMode()).toBe("de_identified");
  });

  it("blocks raw VCF download in de_identified mode (error)", () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "de_identified";
    const request = new Request(
      "http://localhost/api/genomics/callsets/x/object",
    );
    const denied = requirePatientDataAccess(
      request,
      "download_raw",
      "genomics/callsets/object",
    );
    expect(denied?.status).toBe(403);
  });

  it("allows variant summaries in de_identified mode (success)", () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "de_identified";
    const request = new Request("http://localhost/api/genomics/variants");
    expect(
      requirePatientDataAccess(request, "read_summary", "genomics/variants"),
    ).toBeNull();
  });

  it("authorizes bearer token for raw download when configured (success)", () => {
    process.env.LACUNA_PATIENT_DATA_MODE = "authorized";
    process.env.LACUNA_PATIENT_DATA_API_KEY = "test-secret-key";
    const request = new Request(
      "http://localhost/api/genomics/callsets/x/object",
      {
        headers: { Authorization: "Bearer test-secret-key" },
      },
    );
    expect(isPatientDataAuthorized(request)).toBe(true);
    expect(
      requirePatientDataAccess(
        request,
        "download_raw",
        "genomics/callsets/object",
      ),
    ).toBeNull();
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

  it("auditPatientDataAccess dispatches async sink without blocking (success)", async () => {
    vi.mocked(writeAuditEvent).mockClear();
    auditPatientDataAccess({
      action: "read_summary",
      resource: "genomics/variants",
      actor: "127.0.0.1",
      allowed: true,
      mode: "de_identified",
    });
    await Promise.resolve();
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "read_summary",
        resource: "genomics/variants",
        allowed: 1,
        mode: "de_identified",
      }),
    );
  });
});
