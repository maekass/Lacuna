/**
 * Research/intelligence heuristic copy must not qualify a deal citation
 * for dual-source corroboration. Kept in `lib/deals` so the evidence
 * ladder does not import research pipelines.
 */
const RESEARCH_HEURISTIC_CITATION =
  /\b(heuristic_affinity|cited_survey_\d+|cited_epidemiology|cited_public|keyword affinity|sector affinity|portfolio crosswalk|affinity score)\b/i;

/** True when a citation is research/affinity heuristic, not deal evidence. */
export function isResearchHeuristicCitation(text: string): boolean {
  return RESEARCH_HEURISTIC_CITATION.test(text);
}
