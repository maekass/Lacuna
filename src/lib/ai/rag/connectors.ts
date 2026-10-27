/**
 * Source connectors this RAG slice knows about.
 *
 * Only the frozen public CMS excerpt corpus is implemented. The other ids are
 * reserved so later FDA, NIH/ClinicalTrials.gov, OpenAlex, and SEC adapters
 * can plug in without being described as finished.
 */
export const RAG_SOURCE_CONNECTORS = [
  {
    id: "cms_public_snapshot",
    status: "frozen_public_excerpts",
    note:
      "Dated CMS newsroom excerpts and undated pages that stay inadmissible until a publication date is source-verified.",
  },
  {
    id: "fda",
    status: "not_implemented",
    note: "Not a connector in this slice.",
  },
  {
    id: "nih_clinicaltrials",
    status: "not_implemented",
    note: "Not a connector in this slice.",
  },
  {
    id: "openalex",
    status: "not_implemented",
    note: "Not a connector in this slice.",
  },
  {
    id: "sec",
    status: "not_implemented",
    note: "Not a connector in this slice.",
  },
] as const;

export type RagSourceConnectorStatus =
  (typeof RAG_SOURCE_CONNECTORS)[number]["status"];
