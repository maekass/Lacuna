import { isCalendarDay } from "./pointInTime";

/** Fields the structure walk needs. The ledger schema is stricter. */
export interface LedgerStructureRecord {
  readonly id: string;
  readonly companyId: string;
  readonly field: string;
  readonly verificationStatus: string;
  readonly recordedAt: string;
  readonly supersedesId?: string;
}

export interface LedgerStructureIssue {
  readonly rule: string;
  readonly location: string;
  readonly why: string;
  readonly remediation: string;
}

export interface LedgerStructureInspection<
  T extends LedgerStructureRecord = LedgerStructureRecord,
> {
  readonly issues: readonly LedgerStructureIssue[];
  readonly active: Map<string, T>;
}

function issue(
  rule: string,
  location: string,
  why: string,
  remediation: string,
): LedgerStructureIssue {
  return { rule, location, why, remediation };
}

function findCycles(
  byId: ReadonlyMap<string, LedgerStructureRecord>,
): LedgerStructureIssue[] {
  const issues: LedgerStructureIssue[] = [];
  const color = new Map<string, 0 | 1 | 2>();
  const reported = new Set<string>();

  function visit(id: string, stack: string[]): void {
    color.set(id, 1);
    const next = byId.get(id)?.supersedesId;
    if (next && byId.has(next)) {
      const state = color.get(next) ?? 0;
      if (state === 1) {
        const start = stack.indexOf(next);
        const cycleIds = [...stack.slice(start), next];
        const key = [...cycleIds].sort().join(">");
        if (!reported.has(key)) {
          reported.add(key);
          issues.push(issue(
            "ledger.supersessionCycle",
            `evidence:${cycleIds.join("→")}`,
            `Supersession cycle among ${cycleIds.join(" → ")}.`,
            "Break the cycle so corrections form one chain that ends at a single active record. Do not delete historical rows to hide the loop.",
          ));
        }
      } else if (state === 0) {
        visit(next, [...stack, next]);
      }
    }
    color.set(id, 2);
  }

  for (const id of byId.keys()) {
    if ((color.get(id) ?? 0) === 0) visit(id, [id]);
  }
  return issues;
}

/**
 * Relational ledger checks: identity, append-only supersession, and one
 * active claim per company and economic field.
 */
export function inspectLedgerRecords<T extends LedgerStructureRecord>(
  records: readonly T[],
): LedgerStructureInspection<T> {
  const issues: LedgerStructureIssue[] = [];
  const byId = new Map<string, T>();

  for (const record of records) {
    if (byId.has(record.id)) {
      issues.push(issue(
        "ledger.duplicateId",
        `evidence:${record.id}`,
        `Evidence id ${record.id} is used more than once.`,
        "Keep a single row for that id. A real correction needs a new id and supersedesId pointing at the earlier row.",
      ));
      continue;
    }
    byId.set(record.id, record);
  }

  for (const record of byId.values()) {
    if (!record.supersedesId) continue;
    const target = byId.get(record.supersedesId);
    const location = `evidence:${record.id}`;
    if (!target) {
      issues.push(issue(
        "ledger.orphanedSupersedes",
        location,
        `Evidence record ${record.id} supersedes missing record ${record.supersedesId}`,
        "Point supersedesId at an existing record, or remove the dangling reference. Do not invent the missing row.",
      ));
      continue;
    }
    if (
      target.companyId !== record.companyId || target.field !== record.field
    ) {
      issues.push(issue(
        "ledger.supersedesOtherFact",
        location,
        `${record.id} supersedes ${target.id}, which is ${target.companyId}:${target.field} rather than ${record.companyId}:${record.field}.`,
        "supersedesId must reference the same company and economic field.",
      ));
    }
    if (
      record.verificationStatus !== "retracted" &&
      target.verificationStatus === "retracted"
    ) {
      issues.push(issue(
        "ledger.supersedesRetracted",
        location,
        `Active record ${record.id} supersedes retracted record ${target.id}.`,
        "Do not hang a live claim on a retraction. Supersede the last non-retracted claim, or leave the retraction as the end of the chain.",
      ));
    }
    if (
      isCalendarDay(record.recordedAt) &&
      isCalendarDay(target.recordedAt) &&
      record.recordedAt < target.recordedAt
    ) {
      issues.push(issue(
        "ledger.nonAppendRewrite",
        location,
        `${record.id} was recorded on ${record.recordedAt}, before ${target.id} (${target.recordedAt}).`,
        "A correction's recordedAt must be on or after the row it supersedes. Do not rewrite the earlier row in place.",
      ));
    }
  }

  issues.push(...findCycles(byId));

  const superseded = new Set<string>();
  for (const record of byId.values()) {
    if (record.supersedesId && byId.has(record.supersedesId)) {
      superseded.add(record.supersedesId);
    }
  }

  const active = new Map<string, T>();
  for (const record of byId.values()) {
    if (
      superseded.has(record.id) || record.verificationStatus === "retracted"
    ) {
      continue;
    }
    const key = `${record.companyId}:${record.field}`;
    const existing = active.get(key);
    if (existing) {
      issues.push(issue(
        "ledger.conflictingActiveClaim",
        `evidence:${existing.id}+${record.id}`,
        `More than one current evidence record for ${key}; add supersedesId rather than silently choosing one`,
        "Append one correction with supersedesId. Do not leave two active values for the same company and field.",
      ));
      continue;
    }
    active.set(key, record);
  }

  return { issues, active };
}
