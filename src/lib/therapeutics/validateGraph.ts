import { projectTherapeuticClaims } from "./claims";
import { isEntirelyBefore } from "./dates";
import type { TherapeuticsGraph } from "./schema";

export interface TherapeuticsValidationIssue {
  code: string;
  message: string;
}

export interface TherapeuticsValidationReport {
  errors: TherapeuticsValidationIssue[];
  warnings: TherapeuticsValidationIssue[];
  stats: {
    diseases: number;
    assets: number;
    trials: number;
    regulatoryEvents: number;
    claims: number;
    conflicts: number;
    assumptions: number;
  };
}

export interface TherapeuticsValidationOptions {
  /** When set, verifiedCompanyId must be a member. */
  verifiedCompanyIds?: ReadonlySet<string>;
}

function push(
  errors: TherapeuticsValidationIssue[],
  code: string,
  message: string,
): void {
  errors.push({ code, message });
}

/**
 * Integrity checks for a therapeutics graph.
 *
 * Assumptions are rejected if they appear as evidence claims. Dangling
 * asset, trial, and organization references are errors. Publication dates
 * are not back-filled from event dates.
 */
export function validateTherapeuticsGraph(
  graph: TherapeuticsGraph,
  options: TherapeuticsValidationOptions = {},
): TherapeuticsValidationReport {
  const errors: TherapeuticsValidationIssue[] = [];
  const warnings: TherapeuticsValidationIssue[] = [];
  const ids = new Map<string, string>();

  function claimId(id: string, where: string): void {
    const prior = ids.get(id);
    if (prior) {
      push(errors, "duplicate_id", `${id} is used by ${prior} and ${where}`);
      return;
    }
    ids.set(id, where);
  }

  for (const source of graph.sources) {
    claimId(source.id, "source");
    if (!source.url) {
      push(errors, "missing_source_url", `${source.id} is missing a URL`);
    }
  }
  const sourceById = new Map(
    graph.sources.map((source) => [source.id, source]),
  );

  const orgIds = new Set(graph.organizations.map((org) => org.id));
  const assetIds = new Set(graph.assets.map((asset) => asset.id));
  const trialIds = new Set(graph.trials.map((trial) => trial.id));
  const populationIds = new Set(graph.populations.map((item) => item.id));
  const indicationIds = new Set(graph.indications.map((item) => item.id));
  const classIds = new Set(graph.interventionClasses.map((item) => item.id));
  const eventIds = new Set(graph.regulatoryEvents.map((item) => item.id));
  const catalystIds = new Set(graph.catalysts.map((item) => item.id));
  const diseaseIds = new Set(graph.diseases.map((item) => item.id));

  for (const disease of graph.diseases) claimId(disease.id, "disease");
  for (const population of graph.populations) {
    claimId(population.id, "population");
  }
  for (const indication of graph.indications) {
    claimId(indication.id, "indication");
  }
  for (const item of graph.interventionClasses) {
    claimId(item.id, "intervention_class");
  }
  for (const link of graph.assetClassLinks) {
    claimId(link.id, "asset_class_link");
  }
  for (const org of graph.organizations) claimId(org.id, "organization");
  for (const asset of graph.assets) claimId(asset.id, "asset");
  for (const trial of graph.trials) claimId(trial.id, "trial");
  for (const mapping of graph.assetTrialMappings) {
    claimId(mapping.id, "asset_trial_mapping");
  }
  for (const outcome of graph.outcomes) claimId(outcome.id, "outcome");
  for (const event of graph.regulatoryEvents) {
    claimId(event.id, "regulatory_event");
  }
  for (const catalyst of graph.catalysts) claimId(catalyst.id, "catalyst");
  for (const item of graph.commercialEvidence) {
    claimId(item.id, "commercial_evidence");
  }
  for (const conflict of graph.conflicts) claimId(conflict.id, "conflict");
  for (const thesis of graph.theses) {
    claimId(thesis.id, "thesis");
    for (const assumption of thesis.assumptions) {
      claimId(assumption.id, "assumption");
      if (assumption.kind !== "assumption") {
        push(
          errors,
          "assumption_kind",
          `${assumption.id} is not marked as an assumption`,
        );
      }
    }
  }

  const assetNames = new Map<string, string>();
  for (const asset of graph.assets) {
    const key = asset.canonicalName.trim().toLocaleLowerCase("en-US");
    const prior = assetNames.get(key);
    if (prior) {
      push(
        errors,
        "duplicate_asset",
        `Canonical asset name ${asset.canonicalName} duplicates ${prior}`,
      );
    }
    assetNames.set(key, asset.id);
    if (!orgIds.has(asset.sponsorOrganizationId)) {
      push(
        errors,
        "dangling_organization",
        `${asset.id} sponsor ${asset.sponsorOrganizationId} is missing`,
      );
    }
    for (const ownerId of asset.previousOwnerOrganizationIds) {
      if (!orgIds.has(ownerId)) {
        push(
          errors,
          "dangling_organization",
          `${asset.id} previous owner ${ownerId} is missing`,
        );
      }
    }
    for (const relation of asset.relationships) {
      if (!orgIds.has(relation.organizationId)) {
        push(
          errors,
          "dangling_organization",
          `${relation.id} organization ${relation.organizationId} is missing`,
        );
      }
    }
    for (const indicationId of asset.indicationIds) {
      if (!indicationIds.has(indicationId)) {
        push(
          errors,
          "dangling_indication",
          `${asset.id} indication ${indicationId} is missing`,
        );
      }
    }
    for (const classId of asset.interventionClassIds) {
      if (!classIds.has(classId)) {
        push(
          errors,
          "dangling_intervention_class",
          `${asset.id} class ${classId} is missing`,
        );
      }
    }
  }

  for (const indication of graph.indications) {
    if (!diseaseIds.has(indication.diseaseId)) {
      push(
        errors,
        "dangling_disease",
        `${indication.id} disease ${indication.diseaseId} is missing`,
      );
    }
    if (indication.assetId && !assetIds.has(indication.assetId)) {
      push(
        errors,
        "dangling_asset",
        `${indication.id} asset ${indication.assetId} is missing`,
      );
    }
  }

  for (const link of graph.assetClassLinks) {
    if (!assetIds.has(link.assetId)) {
      push(
        errors,
        "dangling_asset",
        `${link.id} asset ${link.assetId} is missing`,
      );
    }
    if (!classIds.has(link.interventionClassId)) {
      push(
        errors,
        "dangling_intervention_class",
        `${link.id} class ${link.interventionClassId} is missing`,
      );
    }
  }

  for (const org of graph.organizations) {
    if (
      org.verifiedCompanyId &&
      options.verifiedCompanyIds &&
      !options.verifiedCompanyIds.has(org.verifiedCompanyId)
    ) {
      push(
        errors,
        "dangling_verified_company",
        `${org.id} verifiedCompanyId ${org.verifiedCompanyId} is not in the verified dataset`,
      );
    }
  }

  const nctIds = new Set<string>();
  for (const trial of graph.trials) {
    if (nctIds.has(trial.nctId)) {
      push(errors, "duplicate_trial", `Duplicate NCT ID ${trial.nctId}`);
    }
    nctIds.add(trial.nctId);
    if (!sourceById.has(trial.sourceId)) {
      push(
        errors,
        "dangling_source",
        `${trial.id} source ${trial.sourceId} is missing`,
      );
    }
    if (
      trial.sponsorOrganizationId &&
      !orgIds.has(trial.sponsorOrganizationId)
    ) {
      push(
        errors,
        "dangling_organization",
        `${trial.id} sponsor organization is missing`,
      );
    }
    if (trial.populationId && !populationIds.has(trial.populationId)) {
      push(
        errors,
        "dangling_population",
        `${trial.id} population ${trial.populationId} is missing`,
      );
    }
    for (const assetId of trial.assetIds) {
      if (!assetIds.has(assetId)) {
        push(
          errors,
          "dangling_asset",
          `${trial.id} asset ${assetId} is missing`,
        );
      }
      const reviewed = graph.assetTrialMappings.some((mapping) =>
        mapping.nctId === trial.nctId && mapping.assetId === assetId
      );
      if (!reviewed) {
        push(
          errors,
          "unreviewed_asset_link",
          `${trial.id} lists ${assetId} without a reviewed asset-trial mapping`,
        );
      }
    }
    for (const diseaseId of trial.diseaseIds) {
      if (!diseaseIds.has(diseaseId)) {
        push(
          errors,
          "dangling_disease",
          `${trial.id} disease ${diseaseId} is missing`,
        );
      }
    }
    if (
      trial.startDate && trial.completionDate &&
      isEntirelyBefore(trial.completionDate, trial.startDate)
    ) {
      push(
        errors,
        "date_order",
        `${trial.id} completion date is entirely before the start date`,
      );
    }
    if (
      trial.startDate && trial.primaryCompletionDate &&
      isEntirelyBefore(trial.primaryCompletionDate, trial.startDate)
    ) {
      push(
        errors,
        "date_order",
        `${trial.id} primary completion is entirely before the start date`,
      );
    }
  }

  for (const mapping of graph.assetTrialMappings) {
    if (!trialIds.has(mapping.nctId)) {
      push(
        errors,
        "dangling_trial",
        `${mapping.id} NCT ${mapping.nctId} is missing`,
      );
    }
    if (!assetIds.has(mapping.assetId)) {
      push(
        errors,
        "dangling_asset",
        `${mapping.id} asset ${mapping.assetId} is missing`,
      );
    }
    const trial = graph.trials.find((item) => item.nctId === mapping.nctId);
    if (!trial) continue;
    if (!trial.assetIds.includes(mapping.assetId)) {
      push(
        errors,
        "mapping_not_applied",
        `${mapping.id} is not applied on ${mapping.nctId}`,
      );
    }
    const names = new Set(
      [
        ...(trial.arms ?? []).flatMap((arm) => arm.interventionNames),
        ...(trial.interventions ?? []).map((item) => item.name),
      ].map((name) => name.toLocaleLowerCase("en-US")),
    );
    for (const interventionName of mapping.interventionNames) {
      if (!names.has(interventionName.toLocaleLowerCase("en-US"))) {
        push(
          errors,
          "mapping_intervention_missing",
          `${mapping.id} intervention ${interventionName} is not on ${trial.nctId}`,
        );
      }
    }
  }

  for (const outcome of graph.outcomes) {
    if (!trialIds.has(outcome.trialId)) {
      push(
        errors,
        "dangling_trial",
        `${outcome.id} trial ${outcome.trialId} is missing`,
      );
    }
    if (outcome.assetId && !assetIds.has(outcome.assetId)) {
      push(
        errors,
        "dangling_asset",
        `${outcome.id} asset ${outcome.assetId} is missing`,
      );
    }
  }

  for (const event of graph.regulatoryEvents) {
    if (!assetIds.has(event.assetId)) {
      push(
        errors,
        "dangling_asset",
        `${event.id} asset ${event.assetId} is missing`,
      );
    }
    if (event.indicationId && !indicationIds.has(event.indicationId)) {
      push(
        errors,
        "dangling_indication",
        `${event.id} indication ${event.indicationId} is missing`,
      );
    }
    const filing = event.filingDate?.value;
    const decision = event.decisionDate?.value;
    if (filing && decision && isEntirelyBefore(decision, filing)) {
      push(
        errors,
        "date_order",
        `${event.id} decision date is entirely before the filing date`,
      );
    }
  }

  for (const catalyst of graph.catalysts) {
    if (!assetIds.has(catalyst.assetId)) {
      push(
        errors,
        "dangling_asset",
        `${catalyst.id} asset ${catalyst.assetId} is missing`,
      );
    }
    if (
      catalyst.relatedTrialId && !trialIds.has(catalyst.relatedTrialId)
    ) {
      push(
        errors,
        "dangling_trial",
        `${catalyst.id} trial ${catalyst.relatedTrialId} is missing`,
      );
    }
    if (
      catalyst.relatedRegulatoryEventId &&
      !eventIds.has(catalyst.relatedRegulatoryEventId)
    ) {
      push(
        errors,
        "dangling_regulatory_event",
        `${catalyst.id} regulatory event is missing`,
      );
    }
  }

  const knownSubjects = new Set<string>([
    ...diseaseIds,
    ...populationIds,
    ...assetIds,
    ...trialIds,
    ...orgIds,
    ...eventIds,
    ...ids.keys(),
  ]);
  for (const item of graph.commercialEvidence) {
    if (!knownSubjects.has(item.subjectId)) {
      push(
        errors,
        "dangling_subject",
        `${item.id} subject ${item.subjectId} is missing`,
      );
    }
    if (item.populationId && !populationIds.has(item.populationId)) {
      push(
        errors,
        "dangling_population",
        `${item.id} population ${item.populationId} is missing`,
      );
    }
  }

  for (const conflict of graph.conflicts) {
    if (!knownSubjects.has(conflict.subject.id)) {
      push(
        errors,
        "dangling_subject",
        `${conflict.id} subject ${conflict.subject.id} is missing`,
      );
    }
    for (const observation of conflict.competingObservations) {
      if (!sourceById.has(observation.sourceId)) {
        push(
          errors,
          "dangling_source",
          `${observation.id} source ${observation.sourceId} is missing`,
        );
      }
    }
  }

  const claims = projectTherapeuticClaims(graph);
  const claimIds = new Set<string>();
  for (const claim of claims) {
    if (claimIds.has(claim.claimId)) {
      push(errors, "duplicate_claim", `Duplicate claim ${claim.claimId}`);
    }
    claimIds.add(claim.claimId);
    if (claim.evidenceKind === "derived" && !claim.derivation) {
      push(
        errors,
        "missing_derivation",
        `${claim.claimId} is derived without a derivation`,
      );
    }
    const source = sourceById.get(claim.sourceId);
    if (!source) {
      push(
        errors,
        "dangling_source",
        `${claim.claimId} source ${claim.sourceId} is missing`,
      );
      continue;
    }
    if (!source.url) {
      push(errors, "missing_source_url", `${source.id} is missing a URL`);
    }
    if (source.publishedAt && claim.asOf < source.publishedAt) {
      push(
        errors,
        "asof_before_publication",
        `${claim.claimId} asOf ${claim.asOf} precedes publication ${source.publishedAt}`,
      );
    }
  }

  for (const thesis of graph.theses) {
    if (!diseaseIds.has(thesis.diseaseId)) {
      push(errors, "dangling_disease", `${thesis.id} disease is missing`);
    }
    for (const assetId of thesis.assetIds) {
      if (!assetIds.has(assetId)) {
        push(
          errors,
          "dangling_asset",
          `${thesis.id} asset ${assetId} is missing`,
        );
      }
    }
    for (const catalystId of thesis.catalystIds) {
      if (!catalystIds.has(catalystId)) {
        push(
          errors,
          "dangling_catalyst",
          `${thesis.id} catalyst ${catalystId} is missing`,
        );
      }
    }
    for (
      const claimIdValue of [
        ...thesis.supportingEvidenceClaimIds,
        ...thesis.contradictingEvidenceClaimIds,
      ]
    ) {
      if (!claimIds.has(claimIdValue)) {
        push(
          errors,
          "dangling_claim",
          `${thesis.id} references missing claim ${claimIdValue}`,
        );
      }
    }
    for (const assumption of thesis.assumptions) {
      if (claimIds.has(assumption.id)) {
        push(
          errors,
          "assumption_in_evidence",
          `${assumption.id} was projected as evidence`,
        );
      }
    }
  }

  const assumptionCount = graph.theses.reduce(
    (sum, thesis) => sum + thesis.assumptions.length,
    0,
  );

  return {
    errors,
    warnings,
    stats: {
      diseases: graph.diseases.length,
      assets: graph.assets.length,
      trials: graph.trials.length,
      regulatoryEvents: graph.regulatoryEvents.length,
      claims: claims.length,
      conflicts: graph.conflicts.length,
      assumptions: assumptionCount,
    },
  };
}
