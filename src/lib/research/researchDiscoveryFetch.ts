/**
 * Fetch public grounding data for domestic study discovery.
 * NIH RePORTER grants + ClinicalTrials.gov — no invented cohort sizes.
 */

import {
  CTG_API_BASE,
  CTG_STUDY_FIELDS,
  ctgFetchHeaders,
} from "@/lib/ingestion/publicRecords/ctgovClient";
import {
  RESEARCH_DISCOVERY_PRESETS,
  type ResearchDiscoveryPreset,
  type ResearchDiscoveryPresetId,
} from "@/lib/research/researchDiscoveryPresets";
import { DOMESTIC_RESEARCH_STUDIES } from "@/lib/research/domesticStudyCatalog";

const NIH_REPORTER = "https://api.reporter.nih.gov/v2/projects/search";

export interface NihGrantRecord {
  applId: number;
  projectTitle: string;
  orgName: string;
  fiscalYear: number;
  awardAmount: number;
  piNames: string[];
  abstractText: string;
  terms: string[];
}

export interface CtgTrialRecord {
  nctId: string;
  title: string;
  sponsor: string;
  conditions: string[];
  enrollment: number | null;
  status: string;
  phase: string;
}

export interface ResearchDiscoveryGrounding {
  presetId: ResearchDiscoveryPresetId;
  presetLabel: string;
  fetchedAt: string;
  existingStudyIds: string[];
  labHints: string[];
  grants: NihGrantRecord[];
  trials: CtgTrialRecord[];
  errors: string[];
}

interface NihReporterProject {
  project_num?: string;
  project_title?: string;
  org_name?: string;
  fiscal_year?: number;
  award_amount?: number;
  abstract_text?: string;
  pref_terms?: string;
  principal_investigators?: Array<{ full_name?: string }>;
  appl_id?: number;
}

interface NihReporterResponse {
  results?: NihReporterProject[];
  meta?: { total?: number };
}

interface CtgStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: { overallStatus?: string };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
    };
    designModule?: {
      phases?: string[];
      enrollmentInfo?: { count?: number };
    };
    conditionsModule?: { conditions?: string[] };
  };
}

interface CtgResponse {
  studies?: CtgStudy[];
  totalCount?: number;
}

function compactGrant(row: NihReporterProject): NihGrantRecord | null {
  const applId = row.appl_id;
  const projectTitle = row.project_title?.trim();
  if (!applId || !projectTitle) return null;

  return {
    applId,
    projectTitle,
    orgName: row.org_name?.trim() ?? "Unknown org",
    fiscalYear: row.fiscal_year ?? 0,
    awardAmount: row.award_amount ?? 0,
    piNames: (row.principal_investigators ?? [])
      .map((pi) => pi.full_name?.trim())
      .filter((name): name is string => Boolean(name)),
    abstractText: (row.abstract_text ?? "").slice(0, 600),
    terms: (row.pref_terms ?? "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12),
  };
}

function compactTrial(study: CtgStudy): CtgTrialRecord | null {
  const protocol = study.protocolSection;
  const nctId = protocol?.identificationModule?.nctId?.trim();
  const title = protocol?.identificationModule?.briefTitle?.trim();
  if (!nctId || !title) return null;

  const enrollment = protocol?.designModule?.enrollmentInfo?.count;
  return {
    nctId,
    title,
    sponsor: protocol?.sponsorCollaboratorsModule?.leadSponsor?.name?.trim() ??
      "Unknown",
    conditions: (protocol?.conditionsModule?.conditions ?? []).slice(0, 6),
    enrollment: typeof enrollment === "number" ? enrollment : null,
    status: protocol?.statusModule?.overallStatus ?? "Unknown",
    phase: protocol?.designModule?.phases?.[0] ?? "N/A",
  };
}

/** NIH RePORTER: org filter + women's health text search. */
export async function fetchNihGrantsForPreset(
  preset: ResearchDiscoveryPreset,
  limit = 20,
): Promise<{ grants: NihGrantRecord[]; error?: string }> {
  try {
    const res = await fetch(NIH_REPORTER, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        criteria: {
          org_names: [...preset.nihOrgNames],
          advanced_text_search: {
            operator: "and",
            search_field: "projecttitle,abstracttext,terms",
            search_text: preset.nihTextSearch,
          },
        },
        include_fields: [
          "ApplId",
          "ProjectTitle",
          "OrgName",
          "FiscalYear",
          "AwardAmount",
          "AbstractText",
          "PrefTerms",
          "PrincipalInvestigators",
        ],
        limit,
        offset: 0,
        sort_field: "fiscal_year",
        sort_order: "desc",
      }),
    });

    if (!res.ok) {
      return { grants: [], error: `NIH RePORTER HTTP ${res.status}` };
    }

    const data = await res.json() as NihReporterResponse;
    const grants = (data.results ?? [])
      .map(compactGrant)
      .filter((g): g is NihGrantRecord => g !== null);

    return { grants };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "NIH RePORTER failed";
    return { grants: [], error: msg };
  }
}

/** ClinicalTrials.gov: sponsor + women's health conditions. */
export async function fetchTrialsForPreset(
  preset: ResearchDiscoveryPreset,
  limit = 15,
): Promise<{ trials: CtgTrialRecord[]; error?: string }> {
  const sponsor = preset.ctgSponsors[0];
  if (!sponsor) return { trials: [] };

  const params = new URLSearchParams({
    "query.spons": sponsor,
    "query.cond": preset.conditionQuery,
    pageSize: String(limit),
    sort: "LastUpdatePostDate:desc",
    fields: CTG_STUDY_FIELDS,
  });

  try {
    const res = await fetch(`${CTG_API_BASE}/studies?${params}`, {
      headers: ctgFetchHeaders(),
    });
    if (!res.ok) {
      return { trials: [], error: `ClinicalTrials.gov HTTP ${res.status}` };
    }

    const data = await res.json() as CtgResponse;
    const trials = (data.studies ?? [])
      .map(compactTrial)
      .filter((t): t is CtgTrialRecord => t !== null);

    return { trials };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClinicalTrials.gov failed";
    return { trials: [], error: msg };
  }
}

/** Build compact JSON grounding snapshot for LLM consumption. */
export function groundingSnapshotForLlm(
  grounding: ResearchDiscoveryGrounding,
): string {
  return JSON.stringify({
    preset: grounding.presetLabel,
    existingStudyIds: grounding.existingStudyIds,
    labHints: grounding.labHints,
    grants: grounding.grants.map((g) => ({
      applId: g.applId,
      title: g.projectTitle,
      org: g.orgName,
      fiscalYear: g.fiscalYear,
      pi: g.piNames.slice(0, 2),
      terms: g.terms.slice(0, 6),
      abstract: g.abstractText.slice(0, 280),
    })),
    trials: grounding.trials.map((t) => ({
      nctId: t.nctId,
      title: t.title,
      sponsor: t.sponsor,
      enrollment: t.enrollment,
      conditions: t.conditions,
      status: t.status,
      phase: t.phase,
    })),
  });
}

/**
 * Fetch NIH grants + CT.gov trials for a discovery preset.
 * Returns errors per source without throwing.
 */
export async function fetchResearchDiscoveryGrounding(
  presetId: ResearchDiscoveryPresetId,
): Promise<ResearchDiscoveryGrounding> {
  const preset = RESEARCH_DISCOVERY_PRESETS[presetId];
  const existingStudyIds = DOMESTIC_RESEARCH_STUDIES
    .filter((s) =>
      s.institution === preset.institution ||
      (presetId === "broad" && s.institution === "harvard_mit_collab") ||
      (presetId === "mit" &&
        (s.institution === "mit" || s.institution === "harvard_mit_collab"))
    )
    .map((s) => s.studyId);

  const [grantResult, trialResult] = await Promise.all([
    fetchNihGrantsForPreset(preset),
    fetchTrialsForPreset(preset),
  ]);

  const errors: string[] = [];
  if (grantResult.error) errors.push(grantResult.error);
  if (trialResult.error) errors.push(trialResult.error);

  return {
    presetId,
    presetLabel: preset.label,
    fetchedAt: new Date().toISOString(),
    existingStudyIds,
    labHints: [...preset.labHints],
    grants: grantResult.grants,
    trials: trialResult.trials,
    errors,
  };
}
