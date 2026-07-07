/**
 * Shared ClinicalTrials.gov API client settings (server routes + ingestion).
 */

import process from "node:process";

export const CTG_API_BASE = "https://clinicaltrials.gov/api/v2";

export const CTG_USER_AGENT =
  "Lacuna-Research/1.0 (educational; mps5cy@virginia.edu)";

/** Modules requested on /studies to minimize payload size. */
export const CTG_STUDY_FIELDS =
  "NCTId,BriefTitle,OverallStatus,Phase,Condition,LeadSponsorName,EnrollmentCount,InterventionName,StudyType,StartDate";

export function ctgFetchHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": CTG_USER_AGENT,
  };
}
