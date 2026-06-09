import { NextResponse } from "next/server";
import { writeAuditEvent } from "@/lib/compliance/auditEventSink";

/**
 * HIPAA/GDPR governance for patient-linked genomic data (VCF call sets).
 * Default: de-identified summaries only — no raw downloads or sample identifiers.
 */

export type PatientDataAccessMode = "blocked" | "de_identified" | "authorized";

export type PatientDataAccessLevel =
  | "read_summary"
  | "read_identifiers"
  | "download_raw";

export interface PatientDataAuditEvent {
  action: PatientDataAccessLevel;
  resource: string;
  actor: string;
  allowed: boolean;
  mode: PatientDataAccessMode;
  timestamp: string;
}

const MINIMUM_LEVEL: Record<PatientDataAccessLevel, PatientDataAccessMode> = {
  read_summary: "de_identified",
  read_identifiers: "authorized",
  download_raw: "authorized",
};

const MODE_RANK: Record<PatientDataAccessMode, number> = {
  blocked: 0,
  de_identified: 1,
  authorized: 2,
};

/** Effective access mode — blocked when variant store handles demo-only deployments. */
export function getPatientDataAccessMode(): PatientDataAccessMode {
  const raw = process.env.LACUNA_PATIENT_DATA_MODE?.trim().toLowerCase();
  if (raw === "authorized" || raw === "de_identified" || raw === "blocked") {
    return raw;
  }
  return "de_identified";
}

function modeSatisfies(
  current: PatientDataAccessMode,
  required: PatientDataAccessMode,
): boolean {
  return MODE_RANK[current] >= MODE_RANK[required];
}

/** Bearer token for authorized PHI/raw access (rotate in production). */
export function isPatientDataAuthorized(request: Request): boolean {
  const expected = process.env.LACUNA_PATIENT_DATA_API_KEY?.trim();
  if (!expected) return false;

  const header = request.headers.get("authorization")?.trim() ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  return token.length > 0 && token === expected;
}

function effectiveMode(request: Request): PatientDataAccessMode {
  const configured = getPatientDataAccessMode();
  if (configured === "authorized" && !isPatientDataAuthorized(request)) {
    return "de_identified";
  }
  return configured;
}

/** Log access attempts — ClickHouse when configured; stdout always for SIEM tailing. */
export function auditPatientDataAccess(
  event: Omit<PatientDataAuditEvent, "timestamp">,
): void {
  const record: PatientDataAuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  console.info("[patient-data-audit]", JSON.stringify({
    ...record,
    actor: "[hashed-at-sink]",
  }));

  void (async () => {
    try {
      await writeAuditEvent({
        timestamp: record.timestamp,
        action: record.action,
        resource: record.resource,
        actor: record.actor,
        allowed: record.allowed ? 1 : 0,
        mode: record.mode,
      });
    } catch (error) {
      console.error("[patient-data-audit] sink failed:", error);
    }
  })();
}

/**
 * Gate genomics handlers by HIPAA minimum-necessary tier.
 * Returns a NextResponse when access must be denied.
 */
export function requirePatientDataAccess(
  request: Request,
  level: PatientDataAccessLevel,
  resource: string,
): NextResponse | null {
  const mode = effectiveMode(request);
  const required = MINIMUM_LEVEL[level];
  const actor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "unknown";

  const allowed = modeSatisfies(mode, required);
  auditPatientDataAccess({
    action: level,
    resource,
    actor,
    allowed,
    mode,
  });

  if (allowed) return null;

  return NextResponse.json(
    {
      error: "Patient data access restricted",
      mode,
      requiredLevel: level,
      hint:
        "HIPAA/GDPR: summaries only in de_identified mode. Set LACUNA_PATIENT_DATA_MODE=authorized and Bearer LACUNA_PATIENT_DATA_API_KEY for identifiers/raw VCF.",
      docs: "docs/PATIENT_DATA_GOVERNANCE.md",
    },
    {
      status: 403,
      headers: { "cache-control": "no-store" },
    },
  );
}

/** Stable pseudonym for sample_id in de-identified API responses. */
export function pseudonymizeSampleId(sampleId: string): string {
  let hash = 0;
  for (let i = 0; i < sampleId.length; i += 1) {
    hash = (hash * 31 + sampleId.charCodeAt(i)) >>> 0;
  }
  return `SAMPLE-${(hash % 1_000_000).toString().padStart(6, "0")}`;
}

export interface CallsetResponseFields {
  sampleId: string;
  objectUri: string;
  notes?: string;
}

/** Apply minimum-necessary redaction to callset payloads. */
export function redactCallsetFields<T extends CallsetResponseFields>(
  callset: T,
  mode: PatientDataAccessMode,
): T {
  if (mode === "authorized") return callset;

  const redacted: T = {
    ...callset,
    sampleId: pseudonymizeSampleId(callset.sampleId),
    objectUri: "",
    notes: callset.notes
      ? "[redacted — de-identified mode]"
      : callset.notes,
  };
  return redacted;
}

/** Consent reference required before ingesting non-demo patient-linked VCFs. */
export function requireIngestConsentRef(studyId: string): string | null {
  if (studyId === "lacuna-infra-seed") return null;

  const consent = process.env.LACUNA_INGEST_CONSENT_REF?.trim();
  if (!consent) {
    return "LACUNA_INGEST_CONSENT_REF is required for non-demo VCF ingest (GDPR lawful basis / HIPAA authorization).";
  }
  return null;
}
