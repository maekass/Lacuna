import { z } from "zod";
import { nctIdSchema } from "../primitives";
import type { ClinicalTrial } from "../schema";
import { clinicalTrialSchema } from "../schema";

const dateStructSchema = z.object({
  date: z.string().optional(),
  type: z.string().optional(),
}).optional();

const studySchema = z.object({
  hasResults: z.boolean().optional(),
  protocolSection: z.object({
    identificationModule: z.object({
      nctId: z.string().optional(),
      briefTitle: z.string().optional(),
      officialTitle: z.string().optional(),
    }).optional(),
    statusModule: z.object({
      overallStatus: z.string().optional(),
      startDateStruct: dateStructSchema,
      primaryCompletionDateStruct: dateStructSchema,
      completionDateStruct: dateStructSchema,
      studyFirstPostDateStruct: dateStructSchema,
      resultsFirstPostDateStruct: dateStructSchema,
      lastUpdatePostDateStruct: dateStructSchema,
    }).optional(),
    sponsorCollaboratorsModule: z.object({
      leadSponsor: z.object({
        name: z.string().optional(),
        class: z.string().optional(),
      }).optional(),
    }).optional(),
    conditionsModule: z.object({
      conditions: z.array(z.string()).optional(),
    }).optional(),
    eligibilityModule: z.object({
      sex: z.string().optional(),
      minimumAge: z.string().optional(),
      maximumAge: z.string().optional(),
    }).optional(),
    designModule: z.object({
      phases: z.array(z.string()).optional(),
      enrollmentInfo: z.object({
        count: z.number().optional(),
        type: z.string().optional(),
      }).optional(),
    }).optional(),
    armsInterventionsModule: z.object({
      armGroups: z.array(z.object({
        label: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        interventionNames: z.array(z.string()).optional(),
      })).optional(),
      interventions: z.array(z.object({
        type: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
    }).optional(),
    outcomesModule: z.object({
      primaryOutcomes: z.array(z.object({
        measure: z.string().optional(),
        timeFrame: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
      secondaryOutcomes: z.array(z.object({
        measure: z.string().optional(),
        timeFrame: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
    }).optional(),
  }).optional(),
});

export interface CtgNormalizationSuccess {
  ok: true;
  trial: ClinicalTrial;
}

export interface CtgNormalizationFailure {
  ok: false;
  errors: string[];
}

export type CtgNormalizationResult =
  | CtgNormalizationSuccess
  | CtgNormalizationFailure;

const partialDate = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function partialOrNull(
  value: string | undefined,
  missing: string[],
  field: string,
): string | null {
  if (!value?.trim()) {
    missing.push(field);
    return null;
  }
  const trimmed = value.trim();
  if (!partialDate.test(trimmed)) {
    missing.push(field);
    return null;
  }
  return trimmed;
}

function endpointList(
  rows:
    | Array<{
      measure?: string;
      timeFrame?: string;
      description?: string;
    }>
    | undefined,
  missing: string[],
  field: string,
): ClinicalTrial["primaryEndpoints"] {
  if (!rows) {
    missing.push(field);
    return null;
  }
  return rows.flatMap((row) => {
    const measure = row.measure?.trim();
    if (!measure) return [];
    return [{
      measure,
      timeFrame: row.timeFrame?.trim() || null,
      description: row.description?.trim() || null,
    }];
  });
}

/**
 * Map one ClinicalTrials.gov API v2 study into a Lacuna clinical trial.
 *
 * Asset links are not inferred. Missing arms, endpoints, and enrollment stay
 * null. Registry status is preserved and is not treated as efficacy.
 */
export function normalizeClinicalTrialsGovStudy(
  input: unknown,
  sourceId: string,
): CtgNormalizationResult {
  const parsed = studySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const protocol = parsed.data.protocolSection;
  const nctRaw = protocol?.identificationModule?.nctId?.trim() ?? "";
  if (!nctIdSchema.safeParse(nctRaw).success) {
    return {
      ok: false,
      errors: [`Invalid or missing NCT ID: ${nctRaw || "(empty)"}`],
    };
  }

  const missing: string[] = [];
  const title = protocol?.identificationModule?.briefTitle?.trim() ||
    protocol?.identificationModule?.officialTitle?.trim() ||
    "";
  if (!title) missing.push("title");

  const status = protocol?.statusModule;
  const design = protocol?.designModule;
  const armsModule = protocol?.armsInterventionsModule;
  const outcomes = protocol?.outcomesModule;

  let arms: ClinicalTrial["arms"] = null;
  if (!armsModule) {
    missing.push("arms");
  } else {
    arms = (armsModule.armGroups ?? []).flatMap((arm) => {
      const label = arm.label?.trim();
      if (!label) return [];
      return [{
        label,
        type: arm.type?.trim() || null,
        description: arm.description?.trim() || null,
        interventionNames: (arm.interventionNames ?? []).map((name) =>
          name.trim()
        ).filter((name) => name.length > 0),
      }];
    });
  }

  let interventions: ClinicalTrial["interventions"] = null;
  if (!armsModule) {
    missing.push("interventions");
  } else {
    interventions = (armsModule.interventions ?? []).flatMap((item) => {
      const name = item.name?.trim();
      if (!name) return [];
      return [{
        type: item.type?.trim() || null,
        name,
        description: item.description?.trim() || null,
      }];
    });
  }

  const conditionRows = protocol?.conditionsModule?.conditions?.map((
    condition,
  ) => condition.trim()).filter((condition) => condition.length > 0);
  const conditions = protocol?.conditionsModule ? (conditionRows ?? []) : null;
  if (!conditions) missing.push("conditions");

  const eligibilityModule = protocol?.eligibilityModule;
  const eligibility = eligibilityModule
    ? {
      sex: eligibilityModule.sex?.trim() || null,
      minimumAge: eligibilityModule.minimumAge?.trim() || null,
      maximumAge: eligibilityModule.maximumAge?.trim() || null,
    }
    : null;
  if (!eligibility) missing.push("eligibility");

  const comparatorLabels = arms === null
    ? null
    : arms.flatMap((arm) =>
      arm.type?.toUpperCase().includes("PLACEBO") ||
        arm.type?.toUpperCase().includes("COMPARATOR")
        ? [arm.label]
        : []
    );

  const enrollmentCount = design?.enrollmentInfo?.count;
  const enrollment = typeof enrollmentCount === "number" &&
      Number.isInteger(enrollmentCount) && enrollmentCount >= 0
    ? {
      count: enrollmentCount,
      type: design?.enrollmentInfo?.type?.trim() || null,
    }
    : null;
  if (!enrollment) missing.push("enrollment");

  const phases = design?.phases?.map((phase) => phase.trim()).filter(Boolean);
  const phase = phases && phases.length > 0 ? phases.join("|") : null;
  if (!phase) missing.push("phase");

  const rawStatus = status?.overallStatus?.trim() || null;
  if (!rawStatus) missing.push("rawStatus");

  const hasResults = typeof parsed.data.hasResults === "boolean"
    ? parsed.data.hasResults
    : null;
  if (hasResults === null) missing.push("hasResults");

  const sponsorName =
    protocol?.sponsorCollaboratorsModule?.leadSponsor?.name?.trim() || null;
  if (!sponsorName) missing.push("sponsorName");

  const trialCandidate = {
    id: nctRaw,
    nctId: nctRaw,
    title: title || nctRaw,
    sponsorName,
    sponsorOrganizationId: null,
    conditions,
    phase,
    rawStatus,
    assetIds: [],
    diseaseIds: [],
    populationId: null,
    eligibility,
    arms,
    interventions,
    comparatorLabels,
    enrollment,
    primaryEndpoints: endpointList(
      outcomes?.primaryOutcomes,
      missing,
      "primaryEndpoints",
    ),
    secondaryEndpoints: endpointList(
      outcomes?.secondaryOutcomes,
      missing,
      "secondaryEndpoints",
    ),
    startDate: partialOrNull(
      status?.startDateStruct?.date,
      missing,
      "startDate",
    ),
    primaryCompletionDate: partialOrNull(
      status?.primaryCompletionDateStruct?.date,
      missing,
      "primaryCompletionDate",
    ),
    completionDate: partialOrNull(
      status?.completionDateStruct?.date,
      missing,
      "completionDate",
    ),
    studyFirstPostDate: partialOrNull(
      status?.studyFirstPostDateStruct?.date,
      missing,
      "studyFirstPostDate",
    ),
    resultsFirstPostDate: partialOrNull(
      status?.resultsFirstPostDateStruct?.date,
      missing,
      "resultsFirstPostDate",
    ),
    lastUpdatePostDate: partialOrNull(
      status?.lastUpdatePostDateStruct?.date,
      missing,
      "lastUpdatePostDate",
    ),
    reportedResultDate: hasResults
      ? partialOrNull(
        status?.resultsFirstPostDateStruct?.date,
        [],
        "reportedResultDate",
      )
      : null,
    hasResults,
    resultStatus: hasResults === null
      ? null
      : hasResults
      ? "results_posted"
      : "results_not_posted",
    missingFields: missing,
    sourceId,
    limitations: [
      "Normalized from one ClinicalTrials.gov study snapshot. Fields are not back-dated to the study-first post date because later registry edits are not separated in this payload.",
      "resultStatus records whether a results section was present. It is not a determination that the trial succeeded or failed.",
      "Therapeutic asset links are not inferred from condition text or intervention names.",
    ],
  };

  const validated = clinicalTrialSchema.safeParse(trialCandidate);
  if (!validated.success) {
    return {
      ok: false,
      errors: validated.error.issues.map((issue) =>
        `${issue.path.join(".") || "(root)"}: ${issue.message}`
      ),
    };
  }

  return { ok: true, trial: validated.data };
}

/** Intervention names present on a normalized trial, without invented rows. */
export function trialInterventionNames(trial: ClinicalTrial): string[] {
  const fromArms = (trial.arms ?? []).flatMap((arm) => arm.interventionNames);
  const fromInterventions = (trial.interventions ?? []).map((item) =>
    item.name
  );
  return [...new Set([...fromArms, ...fromInterventions])];
}
