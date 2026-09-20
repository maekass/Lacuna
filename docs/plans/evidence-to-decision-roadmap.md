<!--
Provenance: AI-assisted synthesis (Perplexity Computer, Claude Fable 5.1) commissioned, specified,
and reviewed by Mae Kass on 2026-09-20. Cross-references docs/reviews/2026-09-20-council-review-claude-fable-5.md
against the career-positioning thesis developed in the same session. Repository inspection was
read-only at commit 5bddc415; the statement below that no repository files were changed describes
that analysis session. This document and the ml/research/council_review_2026_09/ folder were added
afterward in the pull request that introduced this file.
Status: plan only. Do not change src/ or ml/ pipelines from this document without a scoped PR.
-->

# Lacuna: From Council Review to Marketable Investment Judgment

Cross-reference, technical corrections, and a prioritized product roadmap  
Prepared September 20, 2026

## Executive conclusion

The council review strengthens the case for developing investment judgment, but changes the recommended proof of that skill. The strongest addition is not another prediction score or a larger model stack. It is a reproducible investment case that connects a defined question, point-in-time evidence, uncertainty, economic consequences, and a decision you can personally defend.

I recommend a single flagship capability, **Decision Replay**, supported by a small set of reusable evidence and analytical modules. Its career-facing promise should be: “I translate clinical and commercial evidence into defensible investment decisions, and build tools that make the reasoning reproducible.” This is a proposed positioning statement, not a claim that the work is already implemented or personally authored.

The highest-value sequence is:

1. Correct misleading acquisition-score outputs and documentation.
2. Build one evidence-to-decision case with point-in-time provenance.
3. Add a claim-change and contradiction workflow, evaluated against human judgments.
4. Develop a defined clinical-company cohort if it serves a specific research question.
5. Add economic sensitivity and jurisdiction-specific evidence to the same case.
6. Consider predictive-model experiments only after the data and evaluation design justify them.

The aim is not to make “being cautious” your differentiator. It is to show that you can decide what to do next, what evidence is worth obtaining, and what would change the decision.

## Scope and evidence status

This analysis uses the uploaded “Council review (Claude Fable 5)” and the career discussion in this thread. It independently recalculates selected numerical examples, checks selected primary methodological sources, and performs a targeted read-only inspection of Lacuna at commit `5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3`.

This was not a full repository audit, a new Model Council execution, an independent reconstruction of the company dataset, or a rerun of the ClinicalTrials.gov queries. The review’s approximately 150 companies, 58 acquisitions, registry counts, and assumptions about how controls were selected remain supplied inputs rather than newly verified dataset facts. No repository files, pull requests, deployments, or live investment positions were changed.

Evidence labels used below:

- **Observed:** A finding in inspected repository code or documentation.
- **Recomputed:** Arithmetic independently reproduced from the review’s stated inputs.
- **Supported with qualification:** A methodological conclusion supported by primary literature but dependent on assumptions.
- **Proposed:** A new design or career recommendation, not an implemented result.
- **Unverified:** A claim requiring additional data or source reconstruction.

## Where the career argument and council review align

Employer evidence supports the commercial relevance of applied judgment, rather than proving that it is rare: RA Capital has described assessing applicants through a data-driven competitive-landscape exercise and defense of asset selections, while Point72 describes training analysts in research, modeling, and investment pitching ([RA Capital recruiting account](https://www.racap.com/rapport/movie-night-with-ra-capitals-scientific-cartographers); [Point72 Academy](https://point72.com/point72-academy/)). The following mapping is my proposed way to turn the review into proof of that capability.

| Council-review concern | Skill it can demonstrate | Employer-facing work product | What would not establish the skill |
|---|---|---|---|
| No defensible denominator or selection process | Research design and data diligence | Cohort specification, inclusion ledger, coverage limitations | Merely adding more scraped companies |
| Features may reflect post-outcome information | Point-in-time research engineering | A replay that excludes information unavailable at the decision date | A backtest using today’s company profiles |
| Acquisition, completion, and success are different outcomes | Clinical and commercial interpretation | Explicit outcome definitions and a decision memo | Renaming a proxy as clinical or investment success |
| Small samples constrain estimation | Quantitative judgment | Sensitivity analysis, justified abstention, data-acquisition priorities | A more complex model with a precise-looking score |
| Similarity is retrieval, not prediction | Useful product design under constraints | An evaluated comparable-company research workflow | Presenting similarity as acquisition probability |
| Methodology needs a practical roadmap | Capital-allocation and execution judgment | A recommendation with alternatives, reversal conditions, and next diligence | An audit that never reaches a decision |

The distinction matters for positioning. Data integrity is the foundation; judgment is the interpretation; investment relevance is the economic consequence; marketability comes from an artifact a relevant reviewer can understand and challenge. None of the available evidence quantifies applicant scarcity or the causal effect of this portfolio on hiring.

## Corrections before implementing the council recommendations

### The arithmetic is useful, but does not validate a Lacuna model

I reproduced the four prior-correction examples, the four binary-outcome sample-size scenarios, and the illustrative AUC interval. The accompanying standard-library Python script contains four passing tests and prints the scenario outputs.

| Calculation | Recomputed result | Safe interpretation |
|---|---|---|
| Sample-fitted probability 0.68; sample event fraction 58/150; assumed population fractions 5%, 10%, 15%, 20% | Corrected probabilities approximately 15.1%, 27.2%, 37.3%, 45.7% | Sensitivity illustration under the correction’s assumptions, not corrected Lacuna scores |
| Eight parameters, event fraction 58/150, assumed Cox–Snell R² equal to 15% of its maximum | Minimum n = 611 across the three stated criteria | Conditional design calculation, not a universal sample threshold |
| Same setup, 30% of maximum R² | Minimum n = 365 | The answer materially depends on anticipated signal |
| Five parameters, 15% of maximum R² | Minimum n = 382 | Reducing parameters does not remove all precision requirements |
| Eight parameters, population event fraction 10%, 15% of maximum R² | Minimum n = 964 | A different population changes the requirement |
| Assumed AUC 0.70, 12 events, 40 non-events | SE ≈ 0.0926; approximate 95% interval [0.5185, 0.8815] | Hypothetical uncertainty calculation, not measured out-of-time performance |

The sample-size method requires anticipated performance, candidate parameter count, and precision targets; it explicitly argues against a universal events-per-parameter rule ([Riley et al., model development](https://pubmed.ncbi.nlm.nih.gov/30357870/)). Likewise, external-validation requirements should be specified using desired precision and validation-population properties, not a universal permission threshold of 100 events ([Riley et al., external validation](https://pubmed.ncbi.nlm.nih.gov/34031906/)).

The supplied review’s “indistinguishable from coin-flip” wording is too strong for its own approximate interval: its lower bound is above 0.50. The defensible objection is that uncertainty is broad and the example is hypothetical; I did not reproduce observed predictions, estimate a calibration slope, or validate a model.

### The review conflates three different product objects

The inspected model card distinguishes a hand-weighted acquisition indicator from a cosine-similarity engine, and expressly states that the acquisition indicator is not a fitted probability model ([Lacuna model card](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/docs/MODEL_CARD.md)). Therefore, logistic prior correction cannot be applied to that hand-set indicator simply because it is represented on a zero-to-one scale.

The similarity code uses one dimension per sector plus six additional dimensions, including acquired status, rather than a universally fixed eight-dimensional vector ([CompanySimilarity implementation](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/src/components/CompanySimilarity.tsx)). Do not relabel every output “8-D cosine similarity”: the weighted indicator, similarity retrieval, and quarantined ML demo are different mechanisms.

Recommended treatment: remove or reframe the unsupported indicator; retain evaluated retrieval for an explicitly defined comparison task; leave the legacy predictive demo quarantined. An acquired-status feature may be appropriate for descriptive grouping, but must not leak into a pre-acquisition forecasting experiment.

### “Descriptive” does not make a biased event rate valid

The review’s 58/1,200 annual rate uses hypothetical exposure, not reconstructed person-time. Do not publish it as an observed Lacuna acquisition hazard. A disclaimer cannot turn assumed follow-up into measured follow-up.

Simple delayed-entry adjustment requires assumptions about the relationship between entry and event times; it is not a generic repair for a catalog assembled partly because events already happened ([Betensky and Mandel](https://pmc.ncbi.nlm.nih.gov/articles/PMC5502209/)). Catalog ingestion date, historical cohort eligibility date, and first observable source date must remain separate.

For actual cumulative incidence with competing events, use a method appropriate to competing risks rather than mechanically applying one minus Kaplan–Meier; censoring competing events in that calculation overestimates event probability ([Competing Risk Analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC8478701/)). This does not mean cause-specific hazard estimation is always invalid: its estimand differs from cumulative event probability.

Define whether the outcome is “first exit while private” or “any eventual acquisition.” An IPO competes with the former, but a public company can still be acquired; whether IPO is an absorbing competing event is part of the research definition, not a universal rule.

Until eligibility, event dates, observable follow-up, and ascertainment are established, publish catalog composition and missingness rather than survival curves marketed as base rates.

### A registry-derived cohort is promising, not automatically representative

Treat the proposed ClinicalTrials.gov sponsor universe as a cohort-design hypothesis. A current list of sponsors does not by itself establish historical independence from acquisition outcomes, company-level identity, complete event ascertainment, or coverage of nonregistered companies.

Required work includes a versioned query and condition taxonomy, sponsor-to-legal-entity resolution, ownership history, inclusion timing, exclusions, outcome searches, unknown labels, and follow-up rules. “Publicly accessible inputs” does not mean zero labor cost, and a registry-defined cohort would support claims about that cohort, not all women’s-health businesses.

The supplied review reports precise trial counts without providing a replayable query manifest and output snapshot in the attachment. Those counts are unverified here; they should not become platform denominators or résumé claims yet.

### Do not attribute between-study rate differences solely to definitions

The clinical-success studies also differ in time periods and samples: BIO examines 2011–2020 transitions, while Wong et al.’s principal period is 2000–2015 ([BIO report](https://go.bio.org/rs/490-EHZ-999/images/ClinicalDevelopmentSuccessRates2011_2020.pdf); [Wong et al.](https://r.jordan.im/download/research/wong2019.pdf)). The review’s comparison is useful evidence that rates are not interchangeable, but is not an isolated experiment showing that definition alone caused the difference.

### Fix the biomarker framing from the earlier chat

Do not build a two-class “causal versus correlative” classifier and treat the former as inherently investable and the latter as unimportant. Instead, design separate reviewed fields for a claimed prognostic role, treatment-response prediction, pharmacodynamic response, surrogate endpoint status, and causal-mechanistic hypothesis.

These are proposed claim categories, not automatic scientific verdicts. Store context, population, intervention, comparator, endpoint, evidence, and uncertainty; whether an association is clinically or commercially useful must be assessed for its intended use.

## What already exists, and the immediate integrity gap

This targeted inspection found useful foundations, but also a mismatch between disclaimers and exported claims. The observations below concern the pinned source snapshot, not a browser-tested production deployment.

| Existing surface | Observed state | Recommended extension |
|---|---|---|
| Acquisition indicator | Fixed weights, a heuristic confidence calculation, “Predicted acquirer,” and CSV headings “Exit Probability” and “Confidence,” despite descriptive disclaimers ([code](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/src/components/ExitPredictor.tsx)) | Remove unsupported probability/confidence claims throughout UI, exports, types, and pitch-brief consumers; use explicit factors or reviewed comparables |
| Acquisition-age factor | The code calculates current year minus founding year for acquired companies, despite a label referring to prior-exit age ([code](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/src/components/ExitPredictor.tsx)) | Use a defined acquisition event date, preserve date precision, and withhold when unavailable |
| Similarity retrieval | Dynamic sector dimensions, six additional dimensions, missing financial values filled with zero, and an acquired flag ([code](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/src/components/CompanySimilarity.tsx)) | Evaluate task-specific relevance, missingness sensitivity, and feature ablations; do not assume a high cosine match is a good valuation comparable |
| Sampling metadata | A documented convenience-sample scope and external-reference coverage ratio already exist; default overlap need not be record-matched ([code](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/src/lib/data/lacunaDataset/samplingFrame.ts)) | Extend to row-level inclusion and a separate registry-cohort manifest; do not mistake the existing ratio for a representative denominator |
| Clinical labels | An effectiveness-label document is explicitly a plan, separate from the completion proxy ([plan](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/docs/plans/ct-effectiveness-labels.md)) | Use a reviewed endpoint-adjudication queue before modeling; retain protocol hierarchy, multiplicity, margins, and unresolved states |
| AI claim governance | A document proposes claim lifecycle, independent verification, and deterministic policy checks; it is an internal architecture baseline ([architecture](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/docs/AI_ORCHESTRATION_MESH_IC.md)) | Reuse the principles for one working case, without claiming the documented mesh is deployed |

One additional issue in the clinical-label plan should be corrected before implementation: it contains `COALESCE(s.enrollment, cv.number_of_facilities)` while also warning not to treat facility count as enrollment ([clinical-label plan](https://github.com/maekass/Lacuna/blob/5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3/docs/plans/ct-effectiveness-labels.md)). Preserve unknown enrollment as unknown; a different unit is not a valid fallback.

## The proposed flagship: Decision Replay

### Purpose and user experience

Decision Replay would answer: “What could I reasonably have concluded on this date, how did the evidence alter the economics, and what did I decide?” Start with one narrow gynecologic-oncology or diagnostic-adoption case rather than a general acquisition forecast.

The case should have three views:

- **Decision brief:** A one-page recommendation, alternatives, key evidence, economic sensitivity, and reversal conditions.
- **Evidence replay:** A dated sequence of source changes, human interpretations, model-assisted suggestions, and approved decisions.
- **Technical appendix:** Snapshot hashes, extraction versions, inclusion rules, calculation inputs, tests, limitations, and contribution records.

This is an export format and a research workflow, not necessarily a new dashboard. Markdown and machine-readable JSON can be the first implementation; visualization should follow only if it improves review.

### Minimum evidence contract

Each material assertion should preserve:

```text
claim_id
entity_id / program_id / trial_id, as applicable
claim_type and intended_use
population / intervention / comparator / endpoint
jurisdiction and source_language
source_url / exact_quote / source_snapshot_hash
source_published_at / source_available_at / retrieved_at
fact_valid_from / fact_valid_to / date_precision
decision_cutoff
supporting_evidence_ids / conflicting_evidence_ids
review_state / reviewer / reviewed_at
assumptions / uncertainty / prohibited_interpretations
supersedes_claim_id
human_contribution / ai_contribution
```

Separate when something was true, when it became publicly available, and when Lacuna ingested it. A document discovered today may support a reconstructed historical study if historical availability is verified; it cannot establish that you personally foresaw the outcome then.

The feature cutoff must be the prediction or decision date, not merely “before acquisition.” A feature observed after the forecast date but before the event still leaks future information.

### Minimum decision contract

Each decision should preserve the action set, investment or business question, horizon, evidence cutoff, recommendation, alternatives, economics, unresolved uncertainties, next diligence, and reversal conditions. Add probabilities only when their origin and interpretation are explicit; a subjective analyst forecast, a fitted model probability, and a hypothetical scenario weight are different objects.

Use append-only revisions, retained snapshots, and externally timestamped releases where useful. A Git timestamp alone should not be represented as tamper-proof proof of an ex ante investment call.

## Additions that make the flagship differentiated

### Claim-change and contradiction workbench

**Recommendation:** This is the strongest linguistic extension. Compare claims about the same program, endpoint, population, and time horizon across documents, rather than assigning a generic sentiment or “management confidence” score.

Proposed outputs include endpoint changes, narrower populations, altered milestone timing, strengthened or weakened evidence wording, and contradictions requiring review. Preserve original quotations and classify discrepancies as compatible, scope-shifted, temporally superseded, unresolved, or genuinely conflicting after adjudication.

For example, a synthetic case might compare “plans a pivotal trial” with “evaluating development options.” That is a prompt to investigate timing, financing, or strategy, not proof of failure, deception, or a profitable trading signal.

Start with 20–30 manually reviewed document pairs from a narrow domain. This is a workflow pilot, not a validation sample-size claim. Define the ontology before evaluation, measure category-level precision and recall, measure missed material changes, adjudicate disagreements, and preserve a separate evaluation set. Later evaluate across sponsors, time, and document types rather than randomly splitting near-duplicate releases.

**Career proof:** Show one consequential discrepancy you personally reviewed, explain why it mattered, and show the decision it changed. Until prospective, baseline-relative evidence exists, call it evidence-change detection, not “linguistic alpha.”

### Cohort and entity-history ledger

**Recommendation:** Build original structured data where the council identified a missing foundation. For a chosen question, define registry eligibility, preserve sponsor aliases and ownership intervals, and record every inclusion, exclusion, and unresolved entity match.

Store company, sponsor, drug, indication, and trial as separate identifiers with dated relationships. A sponsor rename or licensing deal should not silently create a new drug-development program or transfer a pre-acquisition feature to the wrong parent company.

Required quality reports should include unresolved entities, outcome-unknown cases, date uncertainty, missing follow-up, search failures, and registry coverage limits. An independent audit of a sample of inclusions and exclusions is more useful initially than fitting a more complicated model.

**Career proof:** “I designed and audited the cohort used for this investment question” is a concrete, testable contribution. “I scraped hundreds of companies” is not an equivalent claim.

### Economic sensitivity and next-diligence planner

**Recommendation:** Translate evidence uncertainty into decision uncertainty. Begin with scenario analysis and break-even thresholds; only add expected-value-of-information calculations when the necessary probabilities and payoffs are defensible.

An illustrative, deliberately synthetic example:

| Input | Assumption |
|---|---:|
| Value of proceeding if the favorable scenario occurs | +4 value units |
| Value of proceeding otherwise | −1 value unit |
| Value of not proceeding | 0 |
| Analyst’s hypothetical favorable-scenario range | 15%–35% |

Then \(EV(\text{proceed}) = 4p - (1-p) = 5p-1\), with a break-even probability of 20%. Across the illustrative range, expected value runs from −0.25 to +0.75 units. The conclusion is not “invest”; it is that the unresolved assumption can change the action, so diligence bearing on that assumption may be decision-relevant.

This is a teaching example, not an asset valuation, investment recommendation, measured probability, or model output. If probabilities are unsupported, show the scenario surface and break-even boundary without optimizing an allocation.

**Career proof:** Demonstrate why you pursued one question instead of another, what data could reverse the decision, and how much the conclusion depends on unsupported inputs. Do not confuse collecting more information with collecting information worth its cost.

### Cross-jurisdiction evidence comparison

**Recommendation:** Make “international thinking” a testable comparison of evidence and commercial assumptions, not a map or a country-count feature. Extend the same case to one additional jurisdiction only after the first case works.

Proposed fields include source language, original text, translation provenance, population, care setting, comparator, endpoint, regulatory decision scope, payer or HTA decision scope, implementation constraints, and commercial assumption. Keep trial geography, regulatory jurisdiction, reimbursement jurisdiction, and company domicile distinct.

The system should flag when an inference is being transferred between populations, treatment settings, or jurisdictions without a supporting argument. Differences in documents can arise from different dates, scope, or evidentiary questions; they are not automatically contradictions.

For multilingual sources, preserve the original and an aligned translation, review critical terminology, and evaluate extraction separately by language. Do not claim multilingual scientific expertise merely because an AI translation tool is present.

**Career proof:** Explain why a thesis is attractive under one set of market-access assumptions but not another, with dated evidence and explicit limits. Do not claim a current regulatory or reimbursement difference until the relevant official materials are verified.

### Risk-dependency map and hedge feasibility

**Recommendation:** Start with a map of exposures and failure modes rather than an automated hedging engine. Include shared mechanisms, endpoints, trial operations, reimbursement assumptions, financing needs, and commercialization dependencies.

Separate scientific outcome risk from security-price risk and portfolio risk. A correct clinical call does not specify the price already expected by the market or the exposure an instrument would offset.

Potential outputs are a nontrading scenario matrix, concentration warnings, and a research checklist for position reduction, waiting for evidence, staged commitments, or a potential hedge. Private investments may have no practical instrument that offsets the relevant risk.

Any later hedge analysis requires verified positions or explicit hypothetical exposures, instrument mapping, current pricing, liquidity, borrow availability where relevant, transaction costs, timing, and residual or basis risk. A clinically similar company is not automatically a suitable hedge. No hedge trade, return claim, or “market-neutral” label is justified by this review.

**Career proof:** Show what remains exposed after an action, including when the most defensible risk decision is not to initiate the investment. This is more credible than adding an unvalidated hedge score.

### Comparable-company retrieval evaluation

**Recommendation:** Improve the existing retrieval workflow before replacing it with prediction. Define whether the user wants business-model comparables, clinical-development peers, transaction analogues, or potential strategic buyers; those are different tasks.

Create a reviewed query set with relevant and deliberately misleading examples. Compare existing cosine retrieval against simple sector-and-stage filters; test sensitivity to missing financial data, acquisition status, and feature scaling. Track precision at a specified rank cutoff, reviewer disagreement, source coverage, and stale inputs.

Keep verified membership, analyst comparison relevance, and inferred buyer interest separate. Do not transform a frequent historical acquirer into a predicted buyer.

**Career proof:** A small benchmark showing that a workflow produces more useful diligence candidates can support a research-engineering claim without claiming acquisition forecasting skill. Label pilot results as pilot results and preserve all failed queries.

## Technical implementation sequence

The paths below are proposed additions, not files created in the repository during this review. Keep them small enough that one case can exercise the complete path.

```text
src/lib/decisionEvidence/
  schema.ts
  admissibility.ts
  claimRelations.ts
  decisionSensitivity.ts
  replay.ts

intel/decision-cases/<case-id>/
  manifest.json
  claims.jsonl
  decisions.jsonl
  source-manifest.json
  brief.md
  contribution-ledger.md

scripts/
  validate-decision-case.ts

__tests__/lib/decisionEvidence/
  admissibility.test.ts
  claimRelations.test.ts
  decisionSensitivity.test.ts
```

Reuse existing company IDs, provenance conventions, and dataset boundaries rather than creating a parallel canonical company database. Link the acquisition and clinical-research surfaces to approved case outputs only after the evidence contract is working.

### First 72-hour sprint: one credible vertical slice

This is a proposed time-box, not a guarantee of completion. If historical evidence is unavailable, choose a prospective case rather than filling gaps with reconstructed certainty.

- **First block:** Review and repair misleading acquisition copy and downstream export semantics; define one question and one decision date.
- **Second block:** Implement the minimum evidence and decision schemas, curate a small source packet, and hand-author the first case.
- **Third block:** Add cutoff, missingness, and supersession tests; export the one-page brief and technical appendix; conduct an adversarial human review.

Stop adding infrastructure if it does not improve that case. Do not make registry-wide ingestion, survival modeling, multilingual extraction, and hedge research prerequisites to the first demonstrable result.

### Following sprint: one evaluated extension

Select either the linguistic change-detection pilot or the registry cohort, based on which uncertainty most affects the case. Do not start both automatically.

Predefine a baseline, evaluation cases, failure categories, and the specific claim the results could support. If the pilot does not improve decision usefulness, retain the negative result rather than upgrading the label.

### Later: estimation and model comparisons

Only after cohort definition and data quality support a precise question should you compare statistical or ML approaches. Treat penalized regression, tabular foundation models, or tree models as candidates to evaluate, not as fixes for selection bias or missing historical features.

Specify the horizon, event definition, candidate parameters, expected signal, development and validation precision, censoring treatment, and splits by entity and time. Do not unlock prediction on “500 companies” or “100 events” alone; validation sample size is a design calculation ([Riley et al., development](https://pubmed.ncbi.nlm.nih.gov/30357870/); [Riley et al., validation](https://pubmed.ncbi.nlm.nih.gov/34031906/)).

## Acceptance criteria and proof of personal skill

### Technical acceptance criteria

- **Temporal integrity:** Every admitted claim passes the availability cutoff; later revisions never overwrite earlier evidence silently.
- **Outcome integrity:** Operational completion, endpoint result, regulatory event, phase transition, transaction, and investment return remain distinct.
- **Semantic integrity:** Heuristic scores cannot enter fields typed as calibrated probabilities; unsupported confidence percentages cannot be exported.
- **Unknown-state integrity:** Missing enrollment, prices, dates, and outcomes stay unknown; unit-incompatible fallbacks fail validation.
- **Replay integrity:** The same pinned inputs and code reproduce deterministic calculations; language-model extraction is preserved and versioned rather than presumed deterministic.
- **Review integrity:** Contradictions, disputed translations, and unresolved entity matches cannot silently become approved facts.
- **Benchmark integrity:** All prespecified evaluation cases, including failures and abstentions, remain in the denominator.

Passing these tests would demonstrate system behavior, not the accuracy of every scientific conclusion. Scientific and investment interpretations still need source review and challenge.

### Personal skill evidence

For each case, preserve what you personally framed, researched, interpreted, calculated, changed, tested, and decided, alongside what AI or collaborators supplied. A technically impressive repository alone does not establish that you can perform its reasoning unaided.

Use a practical defense exercise:

1. Explain the question and recommendation without the application.
2. Identify the most decision-sensitive assumption.
3. Recompute a key sensitivity from the stated inputs.
4. Explain a rejected interpretation and the evidence that rejected it.
5. State what would change the recommendation.
6. Explain the system’s principal failure mode and why the tests address it.

After completion, a contribution-safe résumé bullet could be:

> Specified and validated an AI-assisted clinical-diligence workflow linking dated source evidence, reviewed claim changes, and economic sensitivities to an investment recommendation; documented assumptions, failure cases, and personal versus AI contributions.

Use “authored,” “implemented,” or “built” only where contribution records support those verbs. Add measured scope, speed, or accuracy improvements only after benchmarking them; do not invent a productivity percentage or call a historical reconstruction a prospective track record.

## Testing whether the work is marketable

Use the first finished case to test demand before expanding the platform. Ask a small number of relevant investors, healthcare-strategy professionals, or research-engineering reviewers to assess a short brief and then challenge the technical appendix.

Record whether they can identify the decision, find the key evidence, understand the economic consequence, and recognize your personal contribution. Ask what they would need to see before assigning you a similar paid task and whether another proof point, such as modeling depth or domain expertise, remains a more important gap.

This is qualitative career-market feedback, not a statistically powered hiring experiment. Interview conversion and reviewer reactions are useful observations, but cannot isolate the causal effect of this skill from access, role fit, credentials, or timing.

## Final recommendation

The council review is most valuable as raw material for a **research-to-decision case study with an evaluated technical workflow**, not as a list of sophisticated models to implement. Its strongest alignment with the career discussion is the progression from identifying unreliable claims to constructing better evidence and making an accountable decision.

Build Decision Replay first, then add claim-change detection as the leading differentiating extension. Treat a registry cohort, cross-jurisdiction comparison, and risk-dependency map as question-driven expansions. Keep acquisition probabilities, linguistic-alpha claims, and automatic hedge recommendations out of the product until the evidence genuinely supports them.
