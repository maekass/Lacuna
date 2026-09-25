import {
  type EvidenceObservation,
  evidenceObservationSchema,
} from "@/lib/evidenceGraph/schema";

const fdaSafetyCommunication = {
  id: "fda-fcm-safety-communication-2026-09-01",
  title:
    "FDA Adds Boxed Warning to Labeling for Ferric Carboxymaltose Injection (Injectafer) to Describe Risk of Low Phosphate Levels",
  publisher: "U.S. Food and Drug Administration",
  url:
    "https://www.fda.gov/drugs/drug-safety-communications/fda-adds-boxed-warning-labeling-ferric-carboxymaltose-injection-injectafer-describe-risk-low",
  locator: "Drug Safety Communication, What Did FDA Find?",
  publishedAt: "2026-09-01",
  retrievedAt: "2026-09-25",
} as const;

const fdaSupplementApproval = {
  id: "fda-nda-203565-s030-approval-2026-08-13",
  title: "NDA 203565/S-030 Supplement Approval",
  publisher: "U.S. Food and Drug Administration",
  url:
    "https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2026/203565Orig1s030ltr.pdf",
  locator:
    "Page 1, Addition of a Boxed Warning for the risk of hypophosphatemia",
  publishedAt: "2026-08-13",
  retrievedAt: "2026-09-25",
} as const;

const subject = {
  kind: "drug",
  id: "ferric-carboxymaltose",
  label: "Ferric carboxymaltose (Injectafer)",
  identifiers: {
    nda: "203565",
  },
} as const;

/**
 * First US Evidence Graph vertical slice.
 *
 * These records preserve FDA wording and qualifiers rather than converting a
 * threshold ("fewer than 20%") into a false point estimate.
 */
export const ferricCarboxymaltoseUsEvidence: readonly EvidenceObservation[] = [
  evidenceObservationSchema.parse({
    schemaVersion: "1.0.0",
    id: "fcm-us-boxed-warning-hypophosphatemia-2026",
    subject,
    metric: "safety.label.boxed_warning",
    value: "symptomatic_hypophosphatemia",
    comparator: "eq",
    source: fdaSupplementApproval,
    sourceClass: "regulatory",
    geography: {
      level: "country",
      code: "US",
      label: "United States",
    },
    population: {
      definition: "Patients receiving ferric carboxymaltose under the US label",
      inclusion: [],
      exclusion: [],
    },
    eventDate: "2026-08-13",
    asOf: "2026-08-13",
    evidenceKind: "observed",
    limitations: [
      "Regulatory labeling establishes the warning and monitoring requirements; it does not estimate incidence in a target-market population.",
    ],
  }),
  evidenceObservationSchema.parse({
    schemaVersion: "1.0.0",
    id: "fcm-us-serum-phosphate-testing-sentinel-2026",
    subject,
    metric: "safety.monitoring.serum_phosphate_testing_share",
    value: 0.2,
    comparator: "lt",
    unit: "share_of_administration_episodes",
    source: fdaSafetyCommunication,
    sourceClass: "surveillance",
    geography: {
      level: "country",
      code: "US",
      label: "United States",
    },
    population: {
      definition:
        "Ferric carboxymaltose administration episodes represented in FDA Sentinel analyses",
      inclusion: [],
      exclusion: [],
    },
    observedAt: "2026-09-01",
    asOf: "2026-09-01",
    evidenceKind: "observed",
    limitations: [
      "FDA reports the result as fewer than 20%, so 0.20 is stored as an upper bound rather than an exact observed rate.",
      "The FDA communication does not establish that Sentinel utilization patterns generalize to pregnancy or to non-US health systems.",
    ],
  }),
] as const;