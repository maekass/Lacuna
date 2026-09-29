import {
  type TherapeuticsGraph,
  therapeuticsGraphSchema,
} from "@/lib/therapeutics/schema";
import {
  type TherapeuticsValidationOptions,
  type TherapeuticsValidationReport,
  validateTherapeuticsGraph,
} from "@/lib/therapeutics/validateGraph";
import { buildEndometriosisTrialLayer } from "./buildTrials";
import {
  endometriosisAssets,
  endometriosisCatalysts,
  endometriosisClasses,
  endometriosisClassLinks,
  endometriosisCommercial,
  endometriosisConflicts,
  endometriosisDisease,
  endometriosisIndications,
  endometriosisOrganizations,
  endometriosisOutcomes,
  endometriosisPopulations,
  endometriosisRegulatoryEvents,
  endometriosisSources,
  endometriosisTheses,
} from "./curated";

export interface AssembledEndometriosisGraph {
  graph: TherapeuticsGraph | null;
  schemaErrors: string[];
  report: TherapeuticsValidationReport | null;
}

function formatIssuePath(path: PropertyKey[]): string {
  return path.length > 0 ? path.map(String).join(".") : "(root)";
}

/**
 * Join curated endometriosis records with normalized registry trials.
 *
 * The result stays outside `dataset.verified.json`. Schema failures and
 * integrity errors are returned so callers can fail closed.
 */
export function assembleEndometriosisTherapeuticsGraph(
  options: TherapeuticsValidationOptions = {},
): AssembledEndometriosisGraph {
  let layer;
  try {
    layer = buildEndometriosisTrialLayer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { graph: null, schemaErrors: [message], report: null };
  }

  const candidate = {
    schemaVersion: "1.0.0" as const,
    id: "therapeutics-endometriosis-v1",
    sources: [...endometriosisSources, ...layer.sources],
    diseases: [endometriosisDisease],
    populations: [...endometriosisPopulations, ...layer.populations],
    indications: endometriosisIndications,
    interventionClasses: endometriosisClasses,
    assetClassLinks: endometriosisClassLinks,
    organizations: endometriosisOrganizations,
    assets: endometriosisAssets,
    trials: layer.trials,
    assetTrialMappings: layer.mappings,
    outcomes: endometriosisOutcomes,
    regulatoryEvents: endometriosisRegulatoryEvents,
    catalysts: endometriosisCatalysts,
    commercialEvidence: endometriosisCommercial,
    conflicts: endometriosisConflicts,
    theses: endometriosisTheses,
  };

  const parsed = therapeuticsGraphSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      graph: null,
      schemaErrors: parsed.error.issues.map((issue) =>
        `[schema.${formatIssuePath(issue.path)}] ${issue.message}`
      ),
      report: null,
    };
  }

  return {
    graph: parsed.data,
    schemaErrors: [],
    report: validateTherapeuticsGraph(parsed.data, options),
  };
}
