import { assessPublicationAt } from "@/lib/evidenceGraph/temporal";
import { projectTherapeuticClaims, type TherapeuticClaim } from "./claims";
import type { EvidenceConflict, TherapeuticsGraph } from "./schema";

export interface UnresolvedTherapeuticField {
  claimId: string;
  subjectId: string;
  field: string;
  reason: string;
}

export interface TherapeuticStateAt {
  subjectId: string;
  snapshotDate: string;
  admissible: TherapeuticClaim[];
  excludedFuture: TherapeuticClaim[];
  unresolved: UnresolvedTherapeuticField[];
  /** Conflicts are listed, not resolved, by this function. */
  conflicts: EvidenceConflict[];
}

function addId(ids: Set<string>, id: string | null | undefined): void {
  if (id) ids.add(id);
}

/**
 * Subject ids explicitly linked to the requested subject.
 * Links follow stored identifiers. They do not infer new relationships.
 */
export function subjectIdsInScope(
  graph: TherapeuticsGraph,
  subjectId: string,
): Set<string> {
  const ids = new Set<string>([subjectId]);
  const assetIds = new Set<string>();

  for (const disease of graph.diseases) {
    if (disease.id !== subjectId) continue;
    for (
      const relevance of [
        ...disease.populationRelevance,
        ...disease.womensHealthRelevance,
      ]
    ) {
      addId(ids, relevance.populationId);
    }
    for (const indication of graph.indications) {
      if (indication.diseaseId !== disease.id) continue;
      addId(ids, indication.id);
      addId(assetIds, indication.assetId);
    }
  }

  if (graph.assets.some((asset) => asset.id === subjectId)) {
    assetIds.add(subjectId);
  }

  for (const assetId of assetIds) {
    addId(ids, assetId);
    const asset = graph.assets.find((item) => item.id === assetId);
    if (!asset) continue;
    addId(ids, asset.sponsorOrganizationId);
    for (const ownerId of asset.previousOwnerOrganizationIds) {
      addId(ids, ownerId);
    }
    for (const relation of asset.relationships) {
      addId(ids, relation.id);
      addId(ids, relation.organizationId);
    }
    for (const indicationId of asset.indicationIds) addId(ids, indicationId);
    for (const status of asset.developmentStatuses) addId(ids, status.id);
  }

  for (const trial of graph.trials) {
    const linked = trial.id === subjectId ||
      trial.assetIds.some((assetId) => assetIds.has(assetId));
    if (!linked) continue;
    addId(ids, trial.id);
    addId(ids, trial.populationId);
    addId(ids, trial.sponsorOrganizationId);
    for (const assetId of trial.assetIds) addId(ids, assetId);
  }

  for (const outcome of graph.outcomes) {
    if (ids.has(outcome.trialId) || outcome.id === subjectId) {
      addId(ids, outcome.id);
    }
  }
  for (const event of graph.regulatoryEvents) {
    if (assetIds.has(event.assetId) || event.id === subjectId) {
      addId(ids, event.id);
    }
  }
  for (const catalyst of graph.catalysts) {
    if (assetIds.has(catalyst.assetId) || catalyst.id === subjectId) {
      addId(ids, catalyst.id);
    }
  }
  for (const item of graph.commercialEvidence) {
    if (item.subjectId === subjectId || assetIds.has(item.subjectId)) {
      addId(ids, item.id);
    }
  }
  for (const link of graph.assetClassLinks) {
    if (assetIds.has(link.assetId) || link.id === subjectId) {
      addId(ids, link.id);
      addId(ids, link.interventionClassId);
    }
  }
  for (const population of graph.populations) {
    if (population.id === subjectId) addId(ids, population.id);
  }

  return ids;
}

/**
 * Evidence publicly available for a subject on a snapshot date.
 *
 * Publication date decides admissibility. An earlier event date does not
 * admit a later source. Unknown publication dates stay unresolved.
 */
export function getTherapeuticStateAt(
  graph: TherapeuticsGraph,
  subjectId: string,
  snapshotDate: string,
): TherapeuticStateAt {
  const scope = subjectIdsInScope(graph, subjectId);
  const sourceById = new Map(
    graph.sources.map((source) => [source.id, source]),
  );
  const admissible: TherapeuticClaim[] = [];
  const excludedFuture: TherapeuticClaim[] = [];
  const unresolved: UnresolvedTherapeuticField[] = [];

  for (const claim of projectTherapeuticClaims(graph)) {
    if (!scope.has(claim.subjectId)) continue;
    const source = sourceById.get(claim.sourceId);
    const assessment = assessPublicationAt(
      source?.publishedAt,
      snapshotDate,
    );
    if (assessment.status === "admissible") {
      admissible.push(claim);
    } else if (assessment.status === "future") {
      excludedFuture.push(claim);
    } else {
      unresolved.push({
        claimId: claim.claimId,
        subjectId: claim.subjectId,
        field: claim.field,
        reason: assessment.reason,
      });
    }
  }

  for (const trial of graph.trials) {
    if (!scope.has(trial.id)) continue;
    for (const field of trial.missingFields) {
      unresolved.push({
        claimId: `${trial.id}:missing:${field}`,
        subjectId: trial.id,
        field,
        reason: "Field was absent from the ClinicalTrials.gov snapshot",
      });
    }
  }

  const conflicts = graph.conflicts.filter((conflict) =>
    scope.has(conflict.subject.id)
  );

  return {
    subjectId,
    snapshotDate,
    admissible,
    excludedFuture,
    unresolved,
    conflicts,
  };
}
