export type EvidenceAccessMode =
  | "api"
  | "bulk_download"
  | "curated_federal_page";

export interface EvidenceSourceCatalogEntry {
  id: string;
  label: string;
  publisher: string;
  url: string;
  accessMode: EvidenceAccessMode;
  sourceClass:
    | "regulatory"
    | "surveillance"
    | "claims"
    | "trial"
    | "funding"
    | "epidemiology"
    | "workforce";
  updateCadence: string;
  purpose: string;
  boundary: string;
}

/**
 * High-value federal sources for the US Evidence Graph.
 *
 * Catalog entries describe ingestion targets, not evidence observations. No
 * research value is considered verified merely because its source is listed.
 */
export const US_EVIDENCE_SOURCE_CATALOG: readonly EvidenceSourceCatalogEntry[] =
  [
    {
      id: "fda-pmr-pmc",
      label: "FDA Postmarketing Requirements and Commitments",
      publisher: "U.S. Food and Drug Administration",
      url:
        "https://www.fda.gov/drugs/postmarketing-requirements-and-commitments-introduction/postmarketing-requirements-and-commitments-downloadable-database-file",
      accessMode: "bulk_download",
      sourceClass: "regulatory",
      updateCadence: "quarterly",
      purpose:
        "Track required and committed postapproval safety, efficacy, pharmacology, and toxicology studies.",
      boundary:
        "A requirement or commitment is evidence of an FDA obligation, not proof that the study result supports the product.",
    },
    {
      id: "fda-cdrh-rwe",
      label: "FDA CDRH Real-World Evidence regulatory examples",
      publisher: "U.S. Food and Drug Administration",
      url:
        "https://www.fda.gov/medical-devices/science-and-research-medical-devices/cdrh-and-real-world-evidence",
      accessMode: "curated_federal_page",
      sourceClass: "regulatory",
      updateCadence: "irregular",
      purpose:
        "Retrieve regulatory precedents where real-world evidence informed device decisions.",
      boundary:
        "Examples are not an exhaustive corpus and must not be treated as approval probabilities.",
    },
    {
      id: "fda-women-specific-devices",
      label: "FDA Portfolio of Women-Specific Medical Devices",
      publisher: "U.S. Food and Drug Administration",
      url:
        "https://www.fda.gov/science-research/fda-stem-outreach-education-and-engagement/portfolio-women-specific-medical-devices",
      accessMode: "curated_federal_page",
      sourceClass: "regulatory",
      updateCadence: "irregular",
      purpose:
        "Identify women-specific device categories, manufacturers, product codes, indications, regulations, and recalls.",
      boundary:
        "The portfolio supports discovery and gap analysis; completeness must be checked against current CDRH databases.",
    },
    {
      id: "openfda-device",
      label: "openFDA Medical Device APIs",
      publisher: "U.S. Food and Drug Administration",
      url: "https://open.fda.gov/apis/device/",
      accessMode: "api",
      sourceClass: "surveillance",
      updateCadence: "endpoint-specific",
      purpose:
        "Link device classification, 510(k), PMA, adverse-event, recall, registration, and UDI records.",
      boundary:
        "Adverse-event reports do not establish incidence or causality and identifiers are not complete in every endpoint.",
    },
  ] as const;
