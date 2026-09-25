/**
 * Bounded, cited research on an existing deal. This is not a promotion into
 * verified M&A or an input to the Statista-only biopharma valuation model.
 */
import {
  BIOTHERANOSTICS_SOURCES,
  type DossierSource,
} from "./biotheranosticsSources";
export {
  BIOTHERANOSTICS_SOURCES,
  type DossierSource,
} from "./biotheranosticsSources";

export interface DossierClaim {
  readonly id: string;
  readonly title: string;
  readonly kind: "Issuer disclosure" | "Issuer description" | "Study finding";
  readonly statement: string;
  readonly asOf: string;
  readonly basis: string;
  readonly uncertainty: string;
  readonly sourceId: string;
  readonly locator: string;
}

export const BIOTHERANOSTICS_DOSSIER_PATH = "/research/biotheranostics";
export const BIOTHERANOSTICS_DOSSIER_EXPORT = "/research/biotheranostics/brief";
export const BIOTHERANOSTICS_DEAL_ID = "deal7";

export const BIOTHERANOSTICS_DOSSIER = {
  title: "Biotheranostics: a breast-cancer genomics evidence dossier",
  description:
    "Trace Hologic's acquisition disclosures, the scope of Breast Cancer Index, and clinical counterevidence before forming an access-gap thesis.",
  checkedAt: "2026-09-21",
  reviewStatus: "Human specialist review pending",
  question:
    "What does Hologic's acquisition establish about breast-cancer genomics, and what remains unproven about patient access?",
  answer:
    "The filings establish an acquisition of a cancer-diagnostics business, with different price disclosures at announcement and after completion. They do not establish how many eligible patients lack testing. Clinical evidence must be assessed by endpoint and population before this case can support an access-gap thesis.",
  answerClaimIds: [
    "announced-price",
    "completion-price",
    "clinical-counterevidence",
  ],
  scope:
    "Historical transaction disclosures through April 2021; a clinical study published in 2024; and the issuer's product description accessed in September 2026. Later evidence is context, not evidence of what the buyer knew at acquisition.",
  provenance:
    "Sources were checked with AI assistance. Human specialist review and an observed reader session have not occurred. The SEC hosts Hologic's own filings; hosting does not make the SEC an independent author. The study also discloses Biotheranostics support.",
  hypothesis:
    "Investigate whether eligible patients face barriers between a clinician's testing decision and completion of the test. Measure the gap within a defined population, geography, and payer group before estimating an opportunity.",
  unknowns: [
    {
      title: "Who is missing access?",
      missing:
        "This dossier contains no eligible-patient denominator, test uptake, denial rate, or breakdown by ancestry, inherited risk, geography, or insurance.",
      needed:
        "A defined eligible cohort with observed orders, completed tests, and reasons for non-completion, with subgroup methods and uncertainty.",
      disconfirmation:
        "High uptake and few access barriers in the proposed segment would weaken an access-gap thesis.",
    },
    {
      title: "Does the evidence apply to that population?",
      missing:
        "The selected B-42 analysis is not a systematic evidence review and does not establish performance across every proposed subgroup.",
      needed:
        "Specialist review of relevant trials, eligibility, endpoints, biomarker interactions, and subgroup validation. Tumor gene-expression evidence alone does not establish an inherited-risk or ancestry-specific opportunity.",
      disconfirmation:
        "Weak or non-transferable evidence in the intended population would undermine the proposed use case.",
    },
    {
      title: "Is there a viable service or business opportunity?",
      missing:
        "No current coverage determination, reimbursement amount, realized testing revenue, cost-to-serve, or independent pre-acquisition valuation is established here.",
      needed:
        "Dated payer policies and observed operating data matched to the proposed service. The acquisition price cannot supply these inputs.",
      disconfirmation:
        "An existing service that already resolves the barrier, or unsustainable operating economics, would weaken the opportunity.",
    },
  ],
} as const;

export const BIOTHERANOSTICS_CLAIMS: readonly DossierClaim[] = [
  {
    id: "announced-price",
    title: "At announcement: approximately $230 million",
    kind: "Issuer disclosure",
    statement:
      "Hologic reported announcing an agreement to acquire Biotheranostics on January 5, 2021 for approximately US$230.0 million.",
    asOf: "2021-01-05 (announcement event)",
    basis: "USD; approximate announced purchase price for the company.",
    uncertainty:
      "Closing was still subject to regulatory approvals. This figure is not the later reported purchase price or a stand-alone value for Breast Cancer Index.",
    sourceId: "hologic-announcement-filing",
    locator:
      "Note 1, Subsequent Events, page 9: paragraph beginning 'On January 5, 2021'.",
  },
  {
    id: "completion-price",
    title: "After completion: $232.5 million reported",
    kind: "Issuer disclosure",
    statement:
      "Hologic's next quarterly filing reports completion on February 22, 2021 and a purchase price of US$232.5 million.",
    asOf: "2021-02-22 (completion); reported 2021-04-28",
    basis:
      "USD; reported acquisition purchase price in a preliminary purchase-price allocation. It is not labeled enterprise value or net cash paid here.",
    uncertainty:
      "The allocation was preliminary. Later measurement-period adjustments are not reconciled in this bounded case; the two price disclosures do not establish a valuation premium.",
    sourceId: "hologic-completion-filing",
    locator:
      "Note 5, Business Combinations → Fiscal 2021 Acquisitions → Biotheranostics, page 15; opening paragraph and Purchase Price row.",
  },
  {
    id: "business-scope",
    title: "A cancer-diagnostics business with laboratory services",
    kind: "Issuer disclosure",
    statement:
      "The completion filing describes molecular tests for breast and metastatic cancers, laboratory testing at Biotheranostics' facility, and revenue reported in Hologic's Diagnostics service revenue.",
    asOf: "Quarter ended 2021-03-27",
    basis:
      "Acquired business and accounting classification, not a market-size estimate.",
    uncertainty:
      "The purchase price covers the business. This disclosure does not isolate Breast Cancer Index revenue or establish patient access.",
    sourceId: "hologic-completion-filing",
    locator:
      "Note 5 → Biotheranostics, page 15; business description and results-of-operations paragraph.",
  },
  {
    id: "product-scope",
    title: "The product addresses a specific treatment decision",
    kind: "Issuer description",
    statement:
      "Hologic describes Breast Cancer Index as a tumor gene-expression test that informs recurrence risk and the likelihood of benefit from extended endocrine therapy in specified early-stage breast-cancer patients.",
    asOf: "Product page accessed 2026-09-21",
    basis:
      "Manufacturer's product scope and intended use; not an independently assessed effect size.",
    uncertainty:
      "Eligibility and limitations matter. This mutable product description is later than the acquisition and does not establish benefit for every breast-cancer patient.",
    sourceId: "bci-product-description",
    locator:
      "Overview and 'Breast Cancer Index Test Intended Use and Limitations' near the end of the page.",
  },
  {
    id: "clinical-counterevidence",
    title: "Clinical evidence depends on the endpoint",
    kind: "Study finding",
    statement:
      "In the B-42 translational analysis, BCI groups did not significantly differ in extended-letrozole benefit for the primary recurrence-free-interval endpoint. A time-dependent secondary distant-recurrence analysis found benefit in the BCI-high group after four years.",
    asOf: "Study published online 2024-02-20",
    basis:
      "Biomarker analysis within a trial; primary and secondary endpoints must be distinguished. A within-group benefit does not by itself prove a between-group biomarker interaction.",
    uncertainty:
      "The authors describe an underpowered primary analysis and cite validation in other trials. This selected study neither disproves all utility nor demonstrates improved access; it includes manufacturer support.",
    sourceId: "b42-study",
    locator:
      "Abstract → Results and Conclusions; Statistical Analysis; Acknowledgments and author disclosures.",
  },
];

/** Fail clearly if a displayed claim loses its source record. */
export function biotheranosticsSource(sourceId: string): DossierSource {
  const source = BIOTHERANOSTICS_SOURCES.find((item) => item.id === sourceId);
  if (!source) throw new Error(`Unknown dossier source: ${sourceId}`);
  return source;
}
