/**
 * Curated NCT links for weekly catalyst rows.
 * Research / intel only — not verified M&A and not a live sponsor search.
 */

export type CatalystTrialSurface = "deal_keyed" | "research_only";

export interface CatalystNctLink {
  readonly nctId: string;
  readonly url: string;
  readonly title: string;
  readonly surface: CatalystTrialSurface;
  readonly nihSponsor: boolean;
}

export interface CatalystTrialMatch {
  readonly companyContains: string;
  readonly drugContains: string;
  readonly ncts: readonly CatalystNctLink[];
  readonly dealHref?: string;
  readonly dealLabel?: string;
}

/**
 * Sep 18 2026 weekly ingest. GRAIL PATHFINDER rows are also keyed on
 * `c46` in KEYED_REGULATORY_CITATIONS. Relacorilant ROSELLA is the CHMP
 * supporting trial; Corcept is not a verified company.
 */
export const WEEKLY_CATALYST_TRIAL_LINKS: readonly CatalystTrialMatch[] = [
  {
    companyContains: "GRAIL",
    drugContains: "Galleri",
    dealHref: "/deals/deal29",
    dealLabel: "GRAIL → Illumina",
    ncts: [
      {
        nctId: "NCT04241796",
        url: "https://clinicaltrials.gov/study/NCT04241796",
        title: "PATHFINDER — Galleri MCED implementation study",
        surface: "deal_keyed",
        nihSponsor: false,
      },
      {
        nctId: "NCT05155605",
        url: "https://clinicaltrials.gov/study/NCT05155605",
        title: "PATHFINDER 2 — Galleri MCED confirmatory cohort",
        surface: "deal_keyed",
        nihSponsor: false,
      },
    ],
  },
  {
    companyContains: "Corcept",
    drugContains: "relacorilant",
    ncts: [
      {
        nctId: "NCT05257408",
        url: "https://clinicaltrials.gov/study/NCT05257408",
        title:
          "ROSELLA — relacorilant + nab-paclitaxel, platinum-resistant ovarian",
        surface: "research_only",
        nihSponsor: false,
      },
    ],
  },
];

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Return curated trial links for one catalyst row, or undefined.
 */
export function trialLinksForCatalyst(
  company: string,
  drug: string,
): CatalystTrialMatch | undefined {
  return WEEKLY_CATALYST_TRIAL_LINKS.find((row) =>
    includesInsensitive(company, row.companyContains) &&
    includesInsensitive(drug, row.drugContains)
  );
}
