# Biotheranostics dossier: first reader review

Status: implementation prepared; no human reader session has taken place.

Case: `/research/biotheranostics`. It is reachable from `/research`, `/deals`,
and `/deals/deal7`, and is included in the sitemap. The Markdown download at
`/research/biotheranostics/brief` preserves the same claims and limitations. The
dated [Markdown snapshot](dossiers/biotheranostics-2026-09-21.md) can be read
before deployment; regenerate it from `biotheranosticsBrief()` when preparing a
new review snapshot.

## The decision to test

Can a women's-health researcher use this case to distinguish documented
transaction facts from an untested patient-access opportunity?

This is a bounded public-source research case for an existing acquisition. It
does not populate the Statista-only biopharma valuation model, establish a
coverage/payment claim, or promote new records into verified M&A. Its content is
tagged as cited public research on the page; clinical interpretation still needs
human specialist review.

## Run one observed session

Ask one intended reader to start at `/research`. Give them this task:

> Find the Biotheranostics case. Explain the acquisition's two price figures,
> locate a clinical finding that qualifies the thesis, and say whether the
> evidence establishes an underserved patient population. Download a brief that
> you could pass to a colleague with its sources intact.

Let the reader use the site and original sources without coaching. Ask them to
say what they are trying to find. Note where they hesitate, whether they open
the correct source, and which wording they misinterpret. Do not mark a task
complete merely because the page loaded.

| Task                              | Evidence of success                                                                                                                     | Observed result |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Discover the case                 | Opens the dossier from the research workspace                                                                                           | Not observed    |
| Reconcile prices                  | Distinguishes approximate announced USD 230m from USD 232.5m in the first post-close filing; recognizes the preliminary allocation      | Not observed    |
| Verify a transaction claim        | Opens the exact SEC filing and finds Note 5, Biotheranostics                                                                            | Not observed    |
| Evaluate clinical counterevidence | Distinguishes the non-significant primary biomarker interaction from the secondary time-dependent finding; notices the power limitation | Not observed    |
| Identify the evidence gap         | Says that eligible-patient access, subgroup applicability, and operating economics remain unestablished                                 | Not observed    |
| Carry the evidence forward        | Downloads the brief and can find source dates, locators, limitations, and support disclosures                                           | Not observed    |

Record reader role, session date, task completion, elapsed time, prompts needed,
exact points of confusion, and the reader's confidence in their conclusion.
Leave fields blank until the session occurs. Do not invent a participant or
completion rate.

## Let the failure choose the next task

| Observed difficulty                                | Small next change                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Cannot locate the case                             | Improve the entry link's label and placement                                        |
| Treats both prices as the same quantity            | Revise the price-basis explanation                                                  |
| Cannot locate a supporting passage                 | Improve the document locator or add a verified section anchor                       |
| Interprets the secondary result as primary success | Put the endpoint distinction earlier and seek specialist wording review             |
| Treats missing access data as proof of demand      | Strengthen the evidence-gap explanation and define a cohort for subsequent research |
| Loses caveats when sharing                         | Repair the export before adding more dossiers                                       |

Choose the smallest change that resolves an observed failure. Repeat the
affected task with a reader before generalizing this format to more cases.

## Source verification notes

- SEC submissions metadata supplies filing dates: January 27 and April 28, 2021.
  The filings are Hologic-authored documents, despite SEC hosting.
- Announcement evidence is in the quarter ended December 26, 2020, Note 1,
  Subsequent Events (page 9). It reports the January 5, 2021 announcement and
  approximately USD 230m.
- Completion evidence is in the quarter ended March 27, 2021, Note 5,
  Biotheranostics (page 15). It reports February 22 completion and USD 232.5m,
  with a preliminary purchase-price allocation. Later adjustments are not
  reconciled in this case.
- Old investor-relations release URLs redirected to Hologic's homepage at
  verification, so this case uses exact SEC accession documents.
- The B-42 source is Mamounas et al., DOI 10.1158/1078-0432.CCR-23-1977, PMCID
  PMC11061597. Full-text XML from Europe PMC confirms online publication on
  February 20, 2024, issue publication May 1, 2024, and Biotheranostics support.
  The product description is explicitly dated by access, not by an invented
  publication date.
- Page content and exports derive from
  `src/lib/research/biotheranosticsDossier.ts`. Source records live in
  `src/lib/research/biotheranosticsSources.ts` and also feed the canonical
  research registry. The source register contains the exact URLs and the claim
  ledger contains document locators. There is no automatic independence score or
  human verification badge.
