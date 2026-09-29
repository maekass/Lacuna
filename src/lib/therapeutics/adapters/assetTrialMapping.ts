import { trialInterventionNames } from "./clinicalTrialsGov";
import type { AssetTrialMapping, ClinicalTrial } from "../schema";

export interface MappingRejection {
  mappingId: string;
  reason: string;
}

export interface AppliedAssetMappings {
  trial: ClinicalTrial;
  appliedMappingIds: string[];
  rejected: MappingRejection[];
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

/**
 * Attach reviewer-confirmed asset links.
 *
 * `exact_intervention_name` requires every listed name to match one arm
 * intervention name, case-insensitively. `all_intervention_names` is the same
 * check and is used when a combination asset needs more than one intervention
 * to be present. Names that are absent are rejected. Nothing is fuzzy-matched.
 */
export function applyReviewedAssetMappings(
  trial: ClinicalTrial,
  mappings: readonly AssetTrialMapping[],
): AppliedAssetMappings {
  const available = new Set(
    trialInterventionNames(trial).map((name) => normalizeName(name)),
  );

  const applied: string[] = [];
  const rejected: MappingRejection[] = [];
  const assetIds = new Set(trial.assetIds);

  for (const mapping of mappings) {
    if (mapping.nctId !== trial.nctId) continue;
    const missing = mapping.interventionNames.filter((name) =>
      !available.has(normalizeName(name))
    );
    if (trial.arms === null) {
      rejected.push({
        mappingId: mapping.id,
        reason: "Trial source did not include arms or intervention names",
      });
      continue;
    }
    if (missing.length > 0) {
      rejected.push({
        mappingId: mapping.id,
        reason: `Intervention name not present on the trial: ${
          missing.join(", ")
        }`,
      });
      continue;
    }
    assetIds.add(mapping.assetId);
    applied.push(mapping.id);
  }

  return {
    trial: { ...trial, assetIds: [...assetIds] },
    appliedMappingIds: applied,
    rejected,
  };
}
