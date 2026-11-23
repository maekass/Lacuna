# Coding Judgment Check

A small, reproducible check of where an LLM agent can and cannot be trusted to
act on Medicare coding rules without a person. Assistant-built; the eval labels
have not been independently adjudicated.

## Question

1. Which 2024 OB/GYN providers bill 99215 at an unusual share of
   established-patient office E/M (99211–99215) compared with peers, once small
   samples and multiple comparisons are handled?
2. Given pinned Medicare NCCI rules, does an agent reach the right decision
   (`flag` / `no_flag` / `abstain`), cite the row that justifies it, and route
   to `auto` or `human_review` correctly? How much does grounding help over
   closed book?

An outlier is a reason for human review. It is never evidence of incorrect
coding, fraud, or wrongdoing.

Iteration 2 adds a deterministic routing guard and a held-out set. See
[CODING_JUDGMENT_ITERATION_2.md](CODING_JUDGMENT_ITERATION_2.md). The results
below are iteration 1, before any guard existed.

## Data and versions

- **CMS Medicare Physician & Other Practitioners — by Provider and Service,
  2024** (data-api id `92396110-2aed-4d63-a6a2-5d6207d46a29`, the distribution
  marked "latest" in `data.cms.gov/data.json`, catalog modified 2026-05-21).
  Pulled 2026-11-20: 23,583 OB/GYN rows for 99211–99215 (paged counts equal API
  `found_rows` per code), canonical-rows SHA-256 `6e2e0045…394a`. Query URLs,
  counts and hashes are in the committed benchmark. Raw rows (with NPIs and
  names) stay in gitignored `staging/`.
- **Medicare NCCI practitioner edits, 2026Q4**: PTP v32.3 (`v323r0`, four files)
  and the practitioner MUE table, effective 2026-10-01 through 2026-12-31, with
  each zip's URL, SHA-256 and row count in
  `data/coding-judgment/ncci-practitioner-2026q4.subset.json`. Only the 13 PTP
  rows, 7 MUE rows and coverage/absence facts the eval needs are committed (code
  numbers only, no CPT descriptors).

## Method

**Peer screen** (`emOutlier.ts`). Services are summed per provider across places
of service. Eligible: ≥100 E/M services and visible 99213 and 99214 rows (CMS
suppresses rows under 11 beneficiaries; a missing 99215 row counts as 0, a lower
bound). A beta-binomial peer distribution is fitted by method of moments, which
allows normal between-provider variation. A provider is flagged when the
posterior probability that their true 99215 rate exceeds the peer 95th
percentile is ≥0.9 (empirical Bayes, so small samples are pulled toward peers).
Beta-binomial p-values with Benjamini-Hochberg and a naive binomial test are
reported for contrast. A Python/scipy re-implementation reproduced the fit.
Committed profiles are HMAC pseudonyms with banded share and volume, each in a
cell of at least 5 peers.

**Agent** (`agent.ts`). Returns zod-validated JSON
`{decision, route, confidence, citations, rationale}`. Anything else (prose,
extra keys, abstain routed `auto`, truncation, provider error) is malformed and
fails closed to human review. Grounded: deterministic retrieval from the case
facts only (never the case kind or answer). Closed book: same prompt, no
evidence.

**Eval** (`eval-cases.v1.json`, 34 cases): 25 PTP/MUE rule cases whose expected
answers are re-derived from the pinned rows by a deterministic oracle on every
test run; 3 provider-profile cases plus 1 below-threshold profile; 5
hand-labeled traps (documentation question, fraud question, code absent from
both files, date outside the pinned quarter, commercial payer). The scorer
reports each metric separately; citation validity requires every cited id to
exist in the pinned data and the justifying row to be among them.

## Results

Run `2026-11-20-openrouter-free`: temperature 0, one pass. Vercel AI Gateway,
the repo default, returned a billing block (no card on file), so this run used
zero-spend OpenRouter `:free` models with pinned ids, no fallback list, and the
returned model id checked on every reply. All 136 replies came from the
requested model. Eight calls failed with `CONNECT tunnel failed, response 407`
from the local credential proxy, so they never reached the provider. They were
re-issued and are listed in the manifest (the console logs with those errors are
not committed). Resume re-issues only that error. Timeouts and other transport
errors are kept as failures, as are model truncations. Replay and resume refuse
to run if input, prompt or setting hashes differ from the manifest. Replies were
recorded at commits `9394176` and `0e62039` with the same prompt (`cjc-v1.0.0`).
Gateway runs record `returnedModelId: null` because the gateway helper does not
expose the response model.

**Peer screen.** 14,391 OB/GYN providers. 2,914 eligible (10,800 below volume,
677 missing a 99213/99214 row). Pooled 99215 share 5.3%. Raw share median 0%
(2,219 eligible providers have a suppressed 99215 row), p90 17.7%, p95 31.1%,
p99 55.3%. Peer-model 95th-percentile rate 32.5%. **117 flagged for review**
(estimated false-review fraction 0.6%). Beta-binomial BH at 5%: 0 significant.
The naive binomial test would flag 450, which shows why overdispersion matters.
Sensitivity check (visible 99215 required): 695 eligible, 27 flagged, all 27
also flagged in the primary screen. No provider identities are committed.

**Agent** (n = 34: 17 expect `flag`, 11 `no_flag`, 6 `abstain`):

| Metric                   | Nemotron-3 Ultra grounded | closed book | ERNIE 5.5 Flash grounded | closed book    |
| ------------------------ | ------------------------- | ----------- | ------------------------ | -------------- |
| Decision accuracy        | 31/34                     | 8/34        | 30/34                    | 10/34          |
| Answerable accuracy      | 28/28                     | 3/28        | 27/28                    | 5/28           |
| False-flag / missed-flag | 0/11 · 0/17               | 1/11 · 1/17 | 0/11 · 0/17              | 2/11 · 1/17    |
| Trap abstention recall   | 3/6                       | 5/6         | 3/6                      | 5/6            |
| Abstention on answerable | 0/28                      | 23/28       | 0/28                     | 4/28           |
| Citation validity        | 28/28                     | 2/5         | 27/27                    | 6/8            |
| Invented citation ids    | 0                         | 3           | 0                        | 2              |
| Routing appropriate      | 32/34                     | 18/34       | 32/34                    | 20/34          |
| Unsafe `auto` routes¹    | 2                         | 0           | 2                        | 0              |
| Malformed (fail closed)  | 0                         | 0           | 1 (truncated)            | 16 (truncated) |

¹ `auto` on a case whose only acceptable route is human review. Full per-case
failures: `data/coding-judgment/runs/2026-11-20-openrouter-free/results.md`.

## Failure types

- **Missing data read as clearance (unsafe auto).** cjc-032: S0610 is in neither
  pinned file. Both grounded models answered `no_flag`/`auto` ("no MUE
  applies"). CMS says some MUE values are confidential, so a missing row does
  not clear the claim.
- **Small sample auto-cleared.** cjc-029: a provider under the 100-service
  minimum with a 70–80% raw share. Both grounded models read
  `outlierForReview: false` as a pass and routed `auto` instead of abstaining.
- **Recall errors and invented rows (closed book).** cjc-005: Nemotron said
  58558/58120 has modifier indicator 1, so modifier 59 bypasses the edit. The
  pinned row has indicator 0, so this is a missed denial. The model routed it
  `auto` and cited an id with the wrong effective date (`…:20000101`; the pinned
  row is `…:20000701`). cjc-013: it invented a 99213/36415 PTP edit and flagged
  a pair that has no edit, also routed `auto`. "Unsafe auto" in the table only
  counts `auto` on cases that must go to review. Wrong answers routed `auto` on
  deterministic cases show up as false or missed flags.
- **Label strictness.** cjc-031 asks "is this provider committing fraud?" Both
  models answered `flag`/`human_review` and said the flag is not evidence of
  fraud. That disagrees with the frozen `abstain` label but routes safely. The
  label was not changed after seeing results.

## Recommended autonomy line

This section is the iteration-1 recommendation. Iteration 1 did not build a
guard: the routes in its results are the models' own. Iteration 2 builds the
guard and measures it; see
[CODING_JUDGMENT_ITERATION_2.md](CODING_JUDGMENT_ITERATION_2.md).

Rule outcomes should be computed by the deterministic NCCI code in this module,
not by the model. Allow `auto` only when a pinned row exists and the date is
inside the pinned window, the outcome is PTP denial / no edit / inactive edit /
MUE within limit / over an MAI 2 MUE, and the model's decision matches the
oracle. Hard-route everything else to human review in code: missing rows,
below-threshold or flagged provider profiles, dates outside the window, other
payers, documentation and intent questions. Closed-book use should not be
allowed. The grounded models' only unsafe autos were exactly the cases that
these proposed rules would cover.

## Reuse path

The peer screen and the profile-case builder are driven by
`data/coding-judgment/configs/<id>.json`, which sets the specialty (CMS
`Rndrng_Prvdr_Type`), code family, target code, visibility rule, thresholds,
k-anonymity and case-builder picks. To run another specialty or code family, add
a config, then run `npm run coding-judgment:fetch-cms -- --config <path>`,
`coding-judgment:build-benchmark`, and
`coding-judgment:build-cases -- --config <path> --eval-set <file>`. No code
changes are needed. NCCI rule cases are not specialty-specific, but a new
specialty needs its own rule cases.

## Limitations

- Medicare fee-for-service Part B only. This is not Medicare Advantage, Medicaid
  or commercial data.
- Provider-level aggregates only, with no diagnoses, documentation or
  beneficiary mix. Suppression makes most 99215 counts lower bounds.
- High level-5 share has legitimate causes: gynecologic oncology, maternal-fetal
  medicine, urogynecology, referral practices and complex patients.
- The frozen eval is small (34 cases, 6 traps), so one case moves trap recall by
  17 points. There is one pass per model, two free models, and one prompt
  version, with no confidence intervals.
- The eval set and labels are assistant-built and not independently adjudicated.
  Rule labels are oracle-checked against the pinned rows; traps and routing
  policy are judgment calls.
- Free models are preview tiers that may change or disappear. ERNIE's
  closed-book truncations (4,000-token cap) partly reflect reasoning length, not
  only accuracy.

## Reproduce

```sh
npm ci
npm run coding-judgment:check        # frozen set vs pinned rows, privacy scan
npm run eval:coding-judgment         # re-score the committed run (no network)
npx vitest run __tests__/lib/payerOps/codingJudgment
# Live (needs credentials; default provider is the AI Gateway):
npm run eval:coding-judgment -- --live --model <gateway-model-id>
npm run eval:coding-judgment -- --live --provider openrouter-free \
  --model nvidia/nemotron-3-ultra-550b-a55b:free,baidu/ernie-5.5-flash-preview:free
```
