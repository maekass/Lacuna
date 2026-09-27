import { ZodError } from "zod";
import type { VerifiedDataset } from "./datasetSchema";
import {
  type EconomicEvidenceRecord,
  parseEconomicEvidenceLedger,
} from "./evidenceLedger";
import { inspectLedgerRecords } from "./ledgerStructure";
import {
  blockingFinding,
  gapFinding,
  type MeshicFinding,
} from "./meshicFindings";
import { isCalendarDay } from "./pointInTime";
import { computeReplayProvenanceCensus } from "./replayProvenance";

const LEDGER_OWNED_COMPANY_FIELDS = [
  "totalFunding",
  "lastKnownValuation",
  "valuationSource",
] as const;

const ECONOMIC_FIELDS = ["totalFunding", "lastKnownValuation"] as const;

export interface EconomicEvidenceAuditInput {
  readonly ledgerRaw: unknown;
  readonly rawCompanies: readonly Record<string, unknown>[];
  /**
   * Dataset after materialization, as the app would serve it.
   * Compared to the ledger; this audit does not re-apply the ledger.
   */
  readonly materialized: VerifiedDataset | null;
  readonly ledgerLocation?: string;
}

function locationOf(recordId: string, field: string): string {
  return `evidence:${recordId}#${field}`;
}

function isCoarse(
  precision: string,
): precision is "month" | "quarter" | "year" {
  return precision === "month" || precision === "quarter" ||
    precision === "year";
}

/** A coarse fact may store its period start, never an interior day. */
function isPeriodAnchor(date: string, precision: string): boolean {
  if (!isCalendarDay(date)) return false;
  const [, monthText, dayText] = date.split("-");
  const month = Number(monthText);
  const day = Number(dayText);
  if (precision === "year") return month === 1 && day === 1;
  if (precision === "month") return day === 1;
  return day === 1 && (month === 1 || month === 4 || month === 7 ||
    month === 10);
}

function dateFindings(record: EconomicEvidenceRecord): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  const dates: Array<[string, string | null]> = [
    ["recordedAt", record.recordedAt],
    ["effectiveDate", record.effectiveDate],
    ["publicAsOfDate", record.publicAsOfDate],
  ];
  for (const [field, value] of dates) {
    if (value == null) continue;
    if (!isCalendarDay(value)) {
      findings.push(blockingFinding(
        "ledger.invalidDate",
        locationOf(record.id, field),
        `${field} ${value} is not a real calendar day.`,
        "Use a real calendar date from the source, or null when the source does not state one. Do not invent a day.",
      ));
    }
  }
  if (
    record.publicAsOfDate &&
    isCalendarDay(record.publicAsOfDate) &&
    isCalendarDay(record.recordedAt) &&
    record.publicAsOfDate > record.recordedAt
  ) {
    findings.push(blockingFinding(
      "ledger.futurePublicAsOf",
      locationOf(record.id, "publicAsOfDate"),
      `publicAsOfDate ${record.publicAsOfDate} is after recordedAt ${record.recordedAt}.`,
      "A row cannot claim the fact became public after it was recorded. Leave publicAsOfDate null until the fact is public, or correct recordedAt from the curation log.",
    ));
  }
  if (
    record.effectiveDate &&
    record.publicAsOfDate &&
    isCalendarDay(record.effectiveDate) &&
    isCalendarDay(record.publicAsOfDate) &&
    record.publicAsOfDate < record.effectiveDate
  ) {
    findings.push(blockingFinding(
      "ledger.publicBeforeEffective",
      locationOf(record.id, "publicAsOfDate"),
      `publicAsOfDate ${record.publicAsOfDate} is before effectiveDate ${record.effectiveDate}.`,
      "A fact cannot be publicly knowable before it became effective. Correct the date the source supports, or clear the unsupported one. Do not copy an acquisition date.",
    ));
  }
  if (
    record.effectiveDate &&
    isCalendarDay(record.effectiveDate) &&
    isCalendarDay(record.recordedAt) &&
    record.effectiveDate > record.recordedAt
  ) {
    findings.push(blockingFinding(
      "ledger.futureEffectiveDate",
      locationOf(record.id, "effectiveDate"),
      `effectiveDate ${record.effectiveDate} is after recordedAt ${record.recordedAt}.`,
      "Do not record an economic effective date that has not happened yet. Omit effectiveDate until the source's date is in the past relative to the ledger entry.",
    ));
  }
  if (
    record.datePrecision === "unknown" &&
    (record.publicAsOfDate != null || record.effectiveDate != null)
  ) {
    findings.push(blockingFinding(
      "ledger.precisionContradictsDate",
      locationOf(record.id, "datePrecision"),
      "datePrecision is unknown while a calendar date is present.",
      "Set datePrecision to the grain the source actually supports, or clear the date. Do not leave a day on an unknown precision.",
    ));
  }
  if (isCoarse(record.datePrecision)) {
    for (const field of ["publicAsOfDate", "effectiveDate"] as const) {
      const value = record[field];
      if (value == null || !isCalendarDay(value)) continue;
      if (isPeriodAnchor(value, record.datePrecision)) continue;
      findings.push(blockingFinding(
        "ledger.misleadingPrecision",
        locationOf(record.id, field),
        `${field} ${value} is an interior day on ${record.datePrecision} precision.`,
        "Store the period start, or set datePrecision to day only when the source names that day. A coarse fact stays ineligible for day-level replay either way.",
      ));
    }
  }
  if (!record.sourceCitation.trim()) {
    findings.push(blockingFinding(
      "ledger.missingSourceCitation",
      locationOf(record.id, "sourceCitation"),
      "The economic record has no citation text.",
      "Add the citation the curator actually used. A URL is optional when the record legitimately has only a citation. Do not invent a source.",
    ));
  }
  return findings;
}

function schemaFindings(
  error: ZodError,
  ledgerLocation: string,
): MeshicFinding[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return blockingFinding(
      "ledger.schemaInvalid",
      `${ledgerLocation}#${path}`,
      issue.message,
      "Make the record match the economic evidence schema (field, unit, date precision, verification status, and dates). Do not invent a publicAsOfDate to satisfy a check.",
    );
  });
}

function duplicatedCompanyFields(
  rawCompanies: readonly Record<string, unknown>[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const company of rawCompanies) {
    const id = typeof company.id === "string" ? company.id : "(missing id)";
    for (const field of LEDGER_OWNED_COMPANY_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(company, field)) continue;
      if (company[field] === undefined) continue;
      findings.push(blockingFinding(
        "ledger.duplicatedEconomicField",
        `dataset.company:${id}#${field}`,
        `Company ${id} stores ledger-owned ${field} on the company record.`,
        "Remove the field from the company record. Put the value on an evidence ledger row. Do not keep a second copy in dataset.verified.json.",
      ));
    }
  }
  return findings;
}

function companyIdSet(
  rawCompanies: readonly Record<string, unknown>[],
): Set<string> {
  const ids = new Set<string>();
  for (const company of rawCompanies) {
    if (typeof company.id === "string" && company.id.length > 0) {
      ids.add(company.id);
    }
  }
  return ids;
}

function materializationFindings(
  dataset: VerifiedDataset,
  records: readonly EconomicEvidenceRecord[],
): MeshicFinding[] {
  const { issues, active } = inspectLedgerRecords(records);
  if (
    issues.some((issue) =>
      issue.rule === "ledger.conflictingActiveClaim" ||
      issue.rule === "ledger.supersessionCycle" ||
      issue.rule === "ledger.duplicateId"
    )
  ) {
    return [];
  }
  const findings: MeshicFinding[] = [];
  const byId = new Map(
    dataset.companies.map((company) => [company.id, company]),
  );
  for (const [key, record] of active) {
    const company = byId.get(record.companyId);
    const value = company
      ?.[record.field as "totalFunding" | "lastKnownValuation"];
    if (!company || value !== record.value) {
      findings.push(blockingFinding(
        "ledger.untracedMaterializedValue",
        `dataset.company:${record.companyId}#${key}`,
        `Active evidence ${record.id} (${record.value}) is not the materialized ${record.field} for ${record.companyId}.`,
        "Materialize from the single active ledger row. Do not hand-edit the company value and do not leave the ledger row unapplied.",
      ));
    }
  }
  for (const company of dataset.companies) {
    for (const field of ECONOMIC_FIELDS) {
      const value = company[field];
      if (typeof value !== "number") continue;
      if (active.has(`${company.id}:${field}`)) continue;
      findings.push(blockingFinding(
        "ledger.untracedMaterializedValue",
        `dataset.company:${company.id}#${field}`,
        `Materialized ${field} ${value} on ${company.id} has no single active ledger row.`,
        "Remove the company-level value or add exactly one active evidence row that traces it. Do not invent the row's public date.",
      ));
    }
  }
  return findings;
}

/**
 * Ledger integrity plus the current-only provenance gap.
 * Structural failures are blocking. A null publicAsOfDate is a gap.
 */
export function auditEconomicEvidence(
  input: EconomicEvidenceAuditInput,
): MeshicFinding[] {
  const ledgerLocation = input.ledgerLocation ??
    "src/data/evidence.verified.json";
  let ledger;
  try {
    ledger = parseEconomicEvidenceLedger(input.ledgerRaw);
  } catch (error) {
    if (error instanceof ZodError) {
      return schemaFindings(error, ledgerLocation);
    }
    return [blockingFinding(
      "ledger.schemaInvalid",
      ledgerLocation,
      error instanceof Error
        ? error.message
        : "Evidence ledger failed to parse.",
      "Restore schema-valid JSON. Do not replace the ledger with fabricated rows.",
    )];
  }

  const findings: MeshicFinding[] = [
    ...duplicatedCompanyFields(input.rawCompanies),
  ];
  const companyIds = companyIdSet(input.rawCompanies);
  for (const record of ledger.records) {
    if (!companyIds.has(record.companyId)) {
      findings.push(blockingFinding(
        "ledger.invalidCompanyReference",
        locationOf(record.id, "companyId"),
        `Evidence record ${record.id} references missing company ${record.companyId}.`,
        "Point companyId at an existing company, or add that company before the evidence row. Do not invent a company shell to satisfy the reference.",
      ));
    }
    findings.push(...dateFindings(record));
  }

  const { issues } = inspectLedgerRecords(ledger.records);
  for (const structure of issues) {
    findings.push(blockingFinding(
      structure.rule,
      structure.location,
      structure.why,
      structure.remediation,
    ));
  }

  if (
    input.materialized &&
    !findings.some((finding) =>
      finding.rule === "ledger.invalidCompanyReference" ||
      finding.rule === "ledger.conflictingActiveClaim" ||
      finding.rule === "ledger.supersessionCycle" ||
      finding.rule === "ledger.duplicateId" ||
      finding.rule === "ledger.orphanedSupersedes"
    )
  ) {
    findings.push(
      ...materializationFindings(input.materialized, ledger.records),
    );
  }

  findings.push(...replayGapFindings(ledger.records));
  return findings;
}

function replayGapFindings(
  records: readonly EconomicEvidenceRecord[],
): MeshicFinding[] {
  const census = computeReplayProvenanceCensus(records);
  if (census.currentOnlyMissingPublicAsOf === 0) return [];
  const byField = census.byField.map((row) =>
    `${row.field} ${row.currentOnlyMissingPublicAsOf}/${row.records}`
  ).join(", ");
  return [gapFinding(
    "replay.missingPublicAsOf",
    "src/data/evidence.verified.json",
    `${census.currentOnlyMissingPublicAsOf}/${census.economicRecords} active economic records have no publicAsOfDate and are current-catalog only (${byField}).`,
    "Leave publicAsOfDate null until a source shows when the fact was publicly knowable. Do not copy an announcement date, insert a placeholder, or treat the value as zero. Dated replay must keep returning missing-provenance.",
  )];
}
