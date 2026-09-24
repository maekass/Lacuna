/** Primary records shared by the dossier and canonical research registry. */
export interface DossierSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly publisher: string;
  readonly publishedAt: string | null;
  readonly publicationBasis: string;
  readonly accessedAt: string;
  readonly sourceGroup: string;
  readonly relationship: string;
}

export const BIOTHERANOSTICS_SOURCES: readonly DossierSource[] = [
  {
    id: "hologic-announcement-filing",
    title: "Hologic Form 10-Q, quarter ended December 26, 2020",
    url:
      "https://www.sec.gov/Archives/edgar/data/859737/000085973721000006/holx-20201226.htm",
    publisher: "Hologic, Inc. (filed with SEC)",
    publishedAt: "2021-01-27",
    publicationBasis: "SEC filing date; includes a subsequent-event disclosure",
    accessedAt: "2026-09-21",
    sourceGroup: "hologic",
    relationship: "Buyer disclosure; not independent corroboration.",
  },
  {
    id: "hologic-completion-filing",
    title: "Hologic Form 10-Q, quarter ended March 27, 2021",
    url:
      "https://www.sec.gov/Archives/edgar/data/859737/000085973721000012/holx-20210327.htm",
    publisher: "Hologic, Inc. (filed with SEC)",
    publishedAt: "2021-04-28",
    publicationBasis:
      "SEC filing date; first quarterly report after completion",
    accessedAt: "2026-09-21",
    sourceGroup: "hologic",
    relationship: "Same buyer as the announcement filing.",
  },
  {
    id: "bci-product-description",
    title: "Breast Cancer Index — Hologic product information",
    url: "https://www.hologic.com/hologic-products/tests/breast-cancer-index",
    publisher: "Hologic / Biotheranostics",
    publishedAt: null,
    publicationBasis: "Undated, mutable product page; use the access date",
    accessedAt: "2026-09-21",
    sourceGroup: "hologic",
    relationship:
      "Manufacturer description, not an independent efficacy review.",
  },
  {
    id: "b42-study",
    title:
      "Mamounas et al. — Breast Cancer Index and extended aromatase inhibitor benefit in NSABP B-42",
    url: "https://europepmc.org/articles/PMC11061597",
    publisher: "Clinical Cancer Research; full text archived by Europe PMC",
    publishedAt: "2024-02-20",
    publicationBasis:
      "Online publication; journal issue May 1, 2024; DOI 10.1158/1078-0432.CCR-23-1977",
    accessedAt: "2026-09-21",
    sourceGroup: "nsabp-b42",
    relationship:
      "Primary study report with disclosed Biotheranostics support. A separate study group is not a claim of financial independence and does not corroborate the deal price.",
  },
];
