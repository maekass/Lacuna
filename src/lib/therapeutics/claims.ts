import type { EvidenceKind } from "@/lib/evidenceGraph/schema";
import type { ClinicalTrial, TherapeuticsGraph } from "./schema";

export interface TherapeuticClaim {
  claimId: string;
  subjectId: string;
  field: string;
  value: string | number | boolean | null;
  evidenceKind: EvidenceKind;
  derivation?: string;
  sourceId: string;
  eventDate?: string;
  asOf: string;
  limitations: string[];
}

const EVIDENCE_KINDS = new Set(["observed", "derived", "proxy"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourced(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return typeof value.claimId === "string" &&
    typeof value.field === "string" &&
    typeof value.sourceId === "string" &&
    typeof value.asOf === "string" &&
    typeof value.evidenceKind === "string" &&
    EVIDENCE_KINDS.has(value.evidenceKind) &&
    Array.isArray(value.limitations) &&
    "value" in value;
}

function atomicValue(
  value: unknown,
): string | number | boolean | null | undefined {
  if (
    typeof value === "string" || typeof value === "number" ||
    typeof value === "boolean" || value === null
  ) {
    return value;
  }
  return undefined;
}

function walk(
  value: unknown,
  subjectId: string,
  claims: TherapeuticClaim[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, subjectId, claims);
    return;
  }
  if (!isRecord(value)) return;
  if (isSourced(value)) {
    const atomic = atomicValue(value.value);
    if (atomic === undefined) return;
    if (!Array.isArray(value.limitations)) return;
    const limitations = value.limitations.flatMap((item) =>
      typeof item === "string" ? [item] : []
    );
    const evidenceKind = value.evidenceKind;
    if (
      evidenceKind !== "observed" && evidenceKind !== "derived" &&
      evidenceKind !== "proxy"
    ) {
      return;
    }
    claims.push({
      claimId: String(value.claimId),
      subjectId,
      field: String(value.field),
      value: atomic,
      evidenceKind,
      derivation: typeof value.derivation === "string"
        ? value.derivation
        : undefined,
      sourceId: String(value.sourceId),
      eventDate: typeof value.eventDate === "string"
        ? value.eventDate
        : undefined,
      asOf: String(value.asOf),
      limitations,
    });
    return;
  }
  for (const nested of Object.values(value)) walk(nested, subjectId, claims);
}

function trialClaim(
  trial: ClinicalTrial,
  field: string,
  value: string | number | boolean | null,
  asOf: string,
  evidenceKind: EvidenceKind,
  derivation?: string,
): TherapeuticClaim {
  return {
    claimId: `${trial.id}:${field}`,
    subjectId: trial.id,
    field,
    value,
    evidenceKind,
    derivation,
    sourceId: trial.sourceId,
    asOf,
    limitations: trial.limitations,
  };
}

/**
 * Project registry fields into claims dated by the trial source.
 *
 * `studyFirstPostDate` may be stored as a value, but the claim is admissible
 * only when that source's publication date is knowable. A later registry
 * snapshot is not rewritten as if it had been public on the first post date.
 */
export function projectTrialClaims(
  trial: ClinicalTrial,
  asOf: string,
): TherapeuticClaim[] {
  const claims: TherapeuticClaim[] = [
    trialClaim(trial, "registry.title", trial.title, asOf, "observed"),
  ];
  if (trial.rawStatus) {
    claims.push(trialClaim(
      trial,
      "registry.overallStatus",
      trial.rawStatus,
      asOf,
      "observed",
    ));
  }
  if (trial.phase) {
    claims.push(trialClaim(
      trial,
      "registry.phase",
      trial.phase,
      asOf,
      "observed",
    ));
  }
  if (trial.sponsorName) {
    claims.push(trialClaim(
      trial,
      "registry.sponsorName",
      trial.sponsorName,
      asOf,
      "observed",
    ));
  }
  if (trial.enrollment) {
    claims.push(trialClaim(
      trial,
      "registry.enrollmentCount",
      trial.enrollment.count,
      asOf,
      "observed",
    ));
  }
  if (trial.startDate) {
    claims.push(trialClaim(
      trial,
      "registry.startDate",
      trial.startDate,
      asOf,
      "observed",
    ));
  }
  if (trial.primaryCompletionDate) {
    claims.push(trialClaim(
      trial,
      "registry.primaryCompletionDate",
      trial.primaryCompletionDate,
      asOf,
      "observed",
    ));
  }
  if (trial.completionDate) {
    claims.push(trialClaim(
      trial,
      "registry.completionDate",
      trial.completionDate,
      asOf,
      "observed",
    ));
  }
  if (trial.studyFirstPostDate) {
    claims.push(trialClaim(
      trial,
      "registry.studyFirstPostDate",
      trial.studyFirstPostDate,
      asOf,
      "observed",
    ));
  }
  if (trial.resultStatus) {
    claims.push(trialClaim(
      trial,
      "registry.resultStatus",
      trial.resultStatus,
      asOf,
      "derived",
      "Mapped from the ClinicalTrials.gov hasResults boolean. results_posted does not mean the trial met an endpoint.",
    ));
  }
  for (const [index, endpoint] of (trial.primaryEndpoints ?? []).entries()) {
    claims.push(trialClaim(
      trial,
      `registry.primaryEndpoint.${index}`,
      endpoint.measure,
      asOf,
      "observed",
    ));
  }
  return claims;
}

/**
 * Collect evidence claims from a therapeutics graph.
 *
 * Analyst theses are skipped. An assumption cannot become a claim through
 * this projector.
 */
export function projectTherapeuticClaims(
  graph: TherapeuticsGraph,
): TherapeuticClaim[] {
  const claims: TherapeuticClaim[] = [];
  const collections = [
    graph.diseases,
    graph.populations,
    graph.indications,
    graph.interventionClasses,
    graph.assetClassLinks,
    graph.organizations,
    graph.assets,
    graph.outcomes,
    graph.regulatoryEvents,
    graph.catalysts,
    graph.commercialEvidence,
  ];
  for (const collection of collections) {
    for (const entity of collection) {
      if (!entity || typeof entity !== "object" || !("id" in entity)) continue;
      walk(entity, String(entity.id), claims);
    }
  }

  const sourceById = new Map(
    graph.sources.map((source) => [source.id, source]),
  );
  for (const trial of graph.trials) {
    const source = sourceById.get(trial.sourceId);
    const asOf = source?.publishedAt ?? source?.retrievedAt;
    if (!asOf) continue;
    claims.push(...projectTrialClaims(trial, asOf));
  }
  return claims;
}
