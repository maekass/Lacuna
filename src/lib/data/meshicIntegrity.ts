/**
 * Deterministic provenance and historical-replay checks for the MeshIC gate.
 * Findings are either blocking integrity failures or reported provenance gaps.
 */

import { economicEvidenceLedgerSchema } from "./evidenceLedger";
import { MESHIC_CLAIM_EXCEPTIONS } from "./meshicClaimExceptions";

export interface MeshicFinding {
  readonly severity: "RED" | "AMBER";
  readonly blocking: boolean;
  readonly rule: string;
  readonly code: string;
  readonly path: string;
  readonly why: string;
  readonly remediation: string;
}

export interface LedgerRecord {
  id: string;
  companyId: string;
  field: string;
  value: number;
  unit: string;
  sourceCitation: string;
  sourceUrl?: string;
  effectiveDate: string | null;
  publicAsOfDate: string | null;
  datePrecision: string;
  verificationStatus: string;
  recordedAt: string;
  supersedesId?: string;
}

export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

const ECONOMIC_FIELDS = new Set(["totalFunding", "lastKnownValuation"]);

function finding(
  severity: "RED" | "AMBER",
  rule: string,
  code: string,
  path: string,
  why: string,
  remediation: string,
): MeshicFinding {
  return {
    severity,
    blocking: severity === "RED",
    rule,
    code,
    path,
    why,
    remediation,
  };
}

function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function precisionAligned(precision: string, day: string): boolean {
  if (precision === "day") return true;
  if (precision === "month") return day.endsWith("-01");
  if (precision === "year") return day.endsWith("-01-01");
  if (precision === "quarter") {
    return /-01-01$|-04-01$|-07-01$|-10-01$/.test(day);
  }
  return false;
}

function activeRecords(records: readonly LedgerRecord[]): LedgerRecord[] {
  const superseded = new Set(
    records.flatMap((record) =>
      record.supersedesId ? [record.supersedesId] : []
    ),
  );
  return records.filter((record) =>
    !superseded.has(record.id) && record.verificationStatus !== "retracted"
  );
}

/** Schema, identity, supersession, and date-logic checks for the evidence ledger. */
export function assessLedgerIntegrity(
  rawLedger: unknown,
  companyIds: ReadonlySet<string>,
): MeshicFinding[] {
  const parsed = economicEvidenceLedgerSchema.safeParse(rawLedger);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return [finding(
      "RED",
      "ledger.schema",
      "ledger.schemaInvalid",
      issue?.path.join(".") || "evidence.verified.json",
      issue?.message ?? "Evidence ledger failed schema validation.",
      "Fix the record so it matches the economic evidence schema. Do not invent dates.",
    )];
  }

  const records = parsed.data.records as LedgerRecord[];
  const findings: MeshicFinding[] = [];
  const seen = new Set<string>();
  const byId = new Map(records.map((record) => [record.id, record]));

  for (const record of records) {
    const path = `evidence:${record.id}`;
    if (seen.has(record.id)) {
      findings.push(finding(
        "RED",
        "ledger.identity",
        "ledger.duplicateId",
        path,
        "Two evidence records share this id.",
        "Give the successor a new id and point supersedesId at the earlier record.",
      ));
    }
    seen.add(record.id);

    if (!companyIds.has(record.companyId)) {
      findings.push(finding(
        "RED",
        "ledger.identity",
        "ledger.unknownCompany",
        path,
        `Company ${record.companyId} is not in the verified dataset.`,
        "Add the company through curation or remove the orphan evidence record.",
      ));
    }
    if (!ECONOMIC_FIELDS.has(record.field)) {
      findings.push(finding(
        "RED",
        "ledger.schema",
        "ledger.invalidField",
        path,
        `Field ${record.field} is not a ledger-owned economic fact.`,
        "Keep only totalFunding and lastKnownValuation in this ledger.",
      ));
    }

    for (
      const key of ["effectiveDate", "publicAsOfDate", "recordedAt"] as const
    ) {
      const value = record[key];
      if (typeof value === "string" && !validDay(value)) {
        findings.push(finding(
          "RED",
          "ledger.dates",
          "ledger.invalidDate",
          `${path}.${key}`,
          `${key} is not a real calendar day.`,
          "Use YYYY-MM-DD for a real day, or null when the date is unknown.",
        ));
      }
    }

    if (
      record.publicAsOfDate && record.datePrecision === "unknown"
    ) {
      findings.push(finding(
        "RED",
        "ledger.dates",
        "ledger.unknownPrecisionDated",
        `${path}.publicAsOfDate`,
        "A public-as-of date is set while date precision is unknown.",
        "Set datePrecision to the precision the source actually supports, or clear publicAsOfDate.",
      ));
    }
    if (
      record.publicAsOfDate &&
      record.datePrecision !== "unknown" &&
      !precisionAligned(record.datePrecision, record.publicAsOfDate)
    ) {
      findings.push(finding(
        "RED",
        "ledger.dates",
        "ledger.precisionMismatch",
        `${path}.publicAsOfDate`,
        `publicAsOfDate ${record.publicAsOfDate} is finer than datePrecision ${record.datePrecision}.`,
        "Store the bucket start for month, quarter, or year precision, or mark the fact day-precise.",
      ));
    }
    if (
      record.publicAsOfDate &&
      record.recordedAt &&
      validDay(record.publicAsOfDate) &&
      validDay(record.recordedAt) &&
      record.publicAsOfDate > record.recordedAt
    ) {
      findings.push(finding(
        "RED",
        "ledger.dates",
        "ledger.publicAfterRecorded",
        path,
        "publicAsOfDate is after recordedAt, so the ledger claims a future publication.",
        "Record the fact only once it is publicly knowable, or leave publicAsOfDate null.",
      ));
    }
    if (record.supersedesId) {
      const prior = byId.get(record.supersedesId);
      if (!prior) {
        findings.push(finding(
          "RED",
          "ledger.supersession",
          "ledger.orphanedSupersedes",
          path,
          `supersedesId ${record.supersedesId} does not exist.`,
          "Point supersedesId at an existing record id. Do not delete the prior row.",
        ));
      } else if (prior.verificationStatus === "retracted") {
        findings.push(finding(
          "RED",
          "ledger.supersession",
          "ledger.supersedesRetracted",
          path,
          "An active correction supersedes a retracted record.",
          "Append a new record that does not inherit a retracted claim. Leave the retracted row in place.",
        ));
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function walk(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const next = byId.get(id)?.supersedesId;
    const cycle = Boolean(next && walk(next));
    visiting.delete(id);
    visited.add(id);
    return cycle;
  }
  for (const record of records) {
    if (walk(record.id)) {
      findings.push(finding(
        "RED",
        "ledger.supersession",
        "ledger.supersessionCycle",
        `evidence:${record.id}`,
        "supersedesId links form a cycle.",
        "Break the cycle. Corrections append forward; they never point back at a successor.",
      ));
      break;
    }
  }

  const activeByKey = new Map<string, LedgerRecord[]>();
  for (const record of activeRecords(records)) {
    const key = `${record.companyId}:${record.field}`;
    activeByKey.set(key, [...(activeByKey.get(key) ?? []), record]);
  }
  for (const [key, rows] of activeByKey) {
    if (rows.length > 1) {
      findings.push(finding(
        "RED",
        "ledger.supersession",
        "ledger.conflictingActive",
        key,
        `More than one active record (${
          rows.map((row) => row.id).join(", ")
        }).`,
        "Append one successor with supersedesId. Do not leave two live values.",
      ));
    }
  }

  const active = activeRecords(records);
  const missingPublicAsOf = active.filter((record) =>
    record.publicAsOfDate == null
  );
  if (missingPublicAsOf.length > 0) {
    findings.push(finding(
      "RED",
      "ledger.replayEligibility",
      "ledger.missingPublicAsOf",
      "evidence.verified.json",
      `${missingPublicAsOf.length}/${active.length} active economic records have publicAsOfDate null and are current-only. Historical replay cannot use them.`,
      "Attach a real publication date from the source when one exists. Do not invent a date. Until then the strict gate fails because replay eligibility is zero for those facts.",
    ));
  }

  const citationOnly = active.filter((record) => !record.sourceUrl).length;
  if (citationOnly > 0) {
    findings.push(finding(
      "RED",
      "ledger.provenance",
      "ledger.citationWithoutUrl",
      "evidence.verified.json",
      `${citationOnly} active records have a citation and no source URL.`,
      "Add the resolvable source URL the citation names. A citation alone is not enough for the strict gate.",
    ));
  }

  return findings;
}

/** Current economic fields must match exactly one active ledger record. */
export function assessMaterialization(input: {
  readonly rawCompanies: readonly Record<string, unknown>[];
  readonly materializedCompanies: readonly {
    readonly id: string;
    readonly totalFunding?: number;
    readonly lastKnownValuation?: number;
  }[];
  readonly records: readonly LedgerRecord[];
}): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const company of input.rawCompanies) {
    if ("totalFunding" in company || "lastKnownValuation" in company) {
      findings.push(finding(
        "RED",
        "materialization.duplication",
        "materialization.rawEconomicField",
        `company:${String(company.id)}`,
        "A company row duplicates a ledger-owned economic fact.",
        "Remove totalFunding and lastKnownValuation from dataset.verified.json and keep them in the evidence ledger.",
      ));
    }
  }

  const parsed = economicEvidenceLedgerSchema.safeParse({
    schemaVersion: "1.0",
    records: input.records,
  });
  if (!parsed.success) return findings;
  const active = activeRecords(parsed.data.records as LedgerRecord[]);

  for (const company of input.materializedCompanies) {
    for (const field of ["totalFunding", "lastKnownValuation"] as const) {
      const value = company[field];
      if (typeof value !== "number") continue;
      const matches = active.filter((record) =>
        record.companyId === company.id && record.field === field &&
        record.value === value
      );
      if (matches.length !== 1) {
        findings.push(finding(
          "RED",
          "materialization.trace",
          "materialization.untracedValue",
          `company:${company.id}.${field}`,
          `Materialized value ${value} does not trace to exactly one active ledger record (found ${matches.length}).`,
          "Materialize the field from the single active ledger record. Do not copy a second value onto the company.",
        ));
      }
    }
  }
  return findings;
}

const DEAL_DATE_SUBSTITUTION = [
  /publicAsOfDate\s*[:=][^;\n]*announcedDate/,
  /asOf\s*[:=][^;\n]*announcedDate/,
  /publicAsOfDate\s*[:=][^;\n]*closedDate/,
];

const ZERO_COERCION =
  /(?:totalFunding|lastKnownValuation|fundingTotal|raisedToDate)\s*\?\?\s*(?:0|""|''|\[\]|"insufficient"|'insufficient')/;

/** Static scan for historical-replay bypasses. Current-only coercion is non-blocking. */
export function assessReplaySafety(
  files: readonly SourceFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const file of files) {
    if (file.path.endsWith(".test.ts")) continue;
    for (const pattern of DEAL_DATE_SUBSTITUTION) {
      if (pattern.test(file.text)) {
        findings.push(finding(
          "RED",
          "replay.dealDateSubstitution",
          "replay.dealDateAsVintage",
          file.path,
          "A deal announcement or close date is assigned as a funding or valuation vintage.",
          "Leave publicAsOfDate null until the economic source has its own publication date.",
        ));
      }
    }
    const dated = /atDecisionDate|economicEvidenceAtDecisionDate|asOfReplay/
      .test(
        file.text,
      );
    if (ZERO_COERCION.test(file.text)) {
      findings.push(
        dated
          ? finding(
            "RED",
            "replay.coercion",
            "replay.missingCoerced",
            file.path,
            "A dated calculation turns a missing economic value into zero or a default.",
            "Return the value as unavailable. Do not coerce a missing fact to 0 or a favorable score.",
          )
          : finding(
            "RED",
            "replay.coercion",
            "descriptive.missingCoerced",
            file.path,
            "A descriptive path coerces a missing economic value to zero or a default. Zero is not a disclosed fact.",
            "Leave the value unavailable when the ledger has no active record. Do not substitute 0.",
          ),
      );
    }
    if (
      dated &&
      /company\.(totalFunding|lastKnownValuation)/.test(file.text) &&
      !file.path.endsWith("evidenceLedger.ts")
    ) {
      findings.push(finding(
        "RED",
        "replay.rawField",
        "replay.currentFieldInDatedPath",
        file.path,
        "A dated function reads a current company economic field instead of the provenance gate.",
        "Call economicEvidenceAtDecisionDate and use only an eligible record.",
      ));
    }
  }
  return findings;
}

const RAW_IMPORT = /from\s+["'][^"']*dataset\.verified\.json["']/;
const RAW_IMPORT_ALLOW = new Set([
  "src/lib/data/staticDataset.ts",
]);

/** App and metric code must consume the materialized dataset, not the raw JSON. */
export function assessRawDatasetImports(
  files: readonly SourceFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const file of files) {
    if (RAW_IMPORT_ALLOW.has(file.path)) continue;
    if (!RAW_IMPORT.test(file.text)) continue;
    const isCompute = /scripts\/compute-/.test(file.path);
    const isApp = file.path.startsWith("src/");
    if (!isCompute && !isApp) continue;
    findings.push(finding(
      "RED",
      "lineage.rawImport",
      "lineage.rawVerifiedJson",
      file.path,
      "This file imports dataset.verified.json instead of the materialized static dataset.",
      "Import getStaticVerifiedDataset() or receive an already materialized dataset. staticDataset.ts is the only allowed raw import.",
    ));
  }
  return findings;
}

/** Computed artifacts must record the materialized dataset hash. */
export function assessArtifactLineage(
  artifacts: readonly { path: string; datasetHash?: string }[],
  expectedHash: string,
): MeshicFinding[] {
  return artifacts.flatMap((artifact) => {
    if (artifact.datasetHash === expectedHash) return [];
    return [finding(
      "RED",
      "lineage.staleArtifact",
      "lineage.hashMismatch",
      artifact.path,
      `Artifact hash ${
        artifact.datasetHash ?? "missing"
      } does not match the materialized dataset ${expectedHash}.`,
      "Regenerate with npm run compute:all so the artifact is produced from getStaticVerifiedDataset().",
    )];
  });
}

const CLAIM_PATTERNS: readonly { rule: string; pattern: RegExp }[] = [
  { rule: "claim.predicted", pattern: /\bpredict(?:ed|ion|ions|ive)\b/i },
  { rule: "claim.probability", pattern: /\b(?:probability|odds)\b/i },
  { rule: "claim.forecast", pattern: /\bforecast(?:s|ing)?\b/i },
  { rule: "claim.likelyExit", pattern: /\blikely exit\b/i },
  { rule: "claim.certainty", pattern: /\b(?:certainty|guaranteed)\b/i },
];

function negated(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 90), index).toLowerCase();
  return /\b(not|no|without|never|prohibited|cannot|can't|isn't)\b/.test(
    window,
  );
}

function exceptionApplies(file: SourceFile, matchText: string): boolean {
  return MESHIC_CLAIM_EXCEPTIONS.some((exception) =>
    file.path.endsWith(exception.fileSuffix) &&
    file.text.includes(exception.contains) &&
    matchText.includes(exception.contains)
  );
}

function userFacingChunks(source: string): string[] {
  const chunks: string[] = [];
  for (const line of source.split("\n")) {
    for (const match of line.matchAll(/"([^"\n]*)"/g)) {
      const text = match[1] ?? "";
      if (text.length >= 8 && /\s/.test(text) && !text.includes("=>")) {
        chunks.push(text);
      }
    }
    for (const match of line.matchAll(/>([^<>{}]*)</g)) {
      const text = (match[1] ?? "").replace(/\s+/g, " ").trim();
      if (text.length >= 8 && /\s/.test(text)) chunks.push(text);
    }
  }
  return chunks;
}

/**
 * Scan user-facing copy for language that presents descriptive similarity as
 * a forecast. Negations and listed exceptions are allowed.
 */
export function assessClaimLanguage(
  files: readonly SourceFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const file of files) {
    if (
      !file.path.startsWith("src/components") &&
      !file.path.startsWith("src/app")
    ) continue;
    for (const body of userFacingChunks(file.text)) {
      for (const claim of CLAIM_PATTERNS) {
        const hit = claim.pattern.exec(body);
        if (!hit || hit.index === undefined) continue;
        if (negated(body, hit.index)) continue;
        if (exceptionApplies(file, body)) continue;
        const snippet = body.slice(
          Math.max(0, hit.index - 40),
          hit.index + hit[0].length + 40,
        ).replace(/\s+/g, " ");
        findings.push(finding(
          "RED",
          claim.rule,
          "claim.predictiveLanguage",
          file.path,
          `User-facing text says "${hit[0]}" (${snippet}).`,
          "Reframe as precedent, similarity, or a descriptive heuristic. Add a MeshicClaimException only for a bounded non-exit model.",
        ));
        break;
      }
    }
  }
  return findings;
}

export function formatMeshicFinding(item: MeshicFinding): string {
  const kind = item.blocking
    ? "blocking integrity failure"
    : "non-blocking provenance gap";
  return `[${item.severity}] ${item.rule} (${kind}) ${item.path}: ${item.why} Remediation: ${item.remediation}`;
}
