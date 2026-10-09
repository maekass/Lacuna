# Clinical evidence answer evaluation

**Status:** Evaluation harness and review protocol (development)

**Use:** Offline, source-grounded answer quality research

**Not:** Clinical validation, medical-device verification, treatment guidance,
or patient-level decision support

## Why this exists

Lacuna already has a provenance-aware evidence graph and an offline LLM
classification test. The classification test verifies a narrow software path
with mock model output; it does not test evidence retrieval, answerability,
source citation, or researcher judgment.

This harness evaluates a different question:

> Given a frozen set of source-backed evidence and a pre-adjudicated research
> question, does a versioned AI workflow retrieve relevant evidence, cite it
> accurately, answer only within that evidence, and abstain when the evidence
> cannot answer?

The evaluator runs locally against JSON artifacts. It makes no model calls and
requires no patient data or API key. A researcher can review a proposed
benchmark and exported responses offline, then commit or securely retain the
resulting artifacts according to source terms and review agreements.

## What is implemented

- Typed and runtime-validated benchmark and model-run contracts in
  src/lib/ai/evals/clinicalEvidenceEval.ts.
- A deterministic evaluator for disposition accuracy, abstention on unanswerable
  cases, retrieval recall, citation-to-retrieval validity, human-rated citation
  support, review coverage, and descriptive slices.
- Hashing and required model, prompt, retriever, source-snapshot, configuration,
  commit, and reviewer-protocol versions.
- Minimum subgroup-size suppression, pending-review accounting, unknown-case
  failure, and an unconditional clinicalValidationAuthorized: false boundary.
- An offline CLI: npm run eval:clinical-evidence -- --benchmark <benchmark.json>
  --run <run.json> [--out <report.json>].
- Unit tests for the metric and governance behavior.

This is deliberately not connected to a live route or user-facing clinical
feature. Lacuna's current AI routes are not a general evidence-RAG endpoint. The
safe integration path is: export candidate responses and retrieved source IDs
from a specific research workflow; review the frozen benchmark and output files
offline; then run this evaluator. Do not imply that the CLI has measured an app
route until the route actually supplies the run artifact.

## Benchmark design and clinical review protocol

### Case categories

Each case has one pre-adjudicated expected disposition:

- answer: the frozen evidence set supports a bounded answer.
- qualified_answer: some answer is supported, but a stated limitation or scope
  boundary must accompany it.
- abstain: the frozen evidence set does not support a responsible answer to the
  question.

Include ordinary and adversarial cases: direct lookup, conflicting sources, a
publication date versus a later registry update, ambiguous population or
endpoint, source outside the stated scope, and an unanswerable question. Record
subgroup and limitation tags before evaluating model outputs.

### Independent review

1. A curator freezes the exact public source snapshot, records source IDs and
   locators, and writes the question without looking at model output.
2. Two reviewers independently label expected disposition and relevant evidence
   IDs. Reviewers should have appropriate clinical, research, or methods
   expertise for the case; aliases and roles are recorded, not unnecessary
   personal details.
3. A reviewer documents population, setting, endpoint, timing, exclusions, and
   material source limitations. If reviewers disagree, a named adjudication step
   records the resolution and rationale.
4. A separate output review assesses whether each cited source supports its
   linked claim. Record two distinct reviewer aliases and roles for every
   assessed citation; mark citations supports, partially_supports,
   does_not_support, or not_assessed. Do not treat a model's self-reported
   confidence as review.
5. Keep pending or disputed cases visible in the benchmark. The evaluator
   excludes pending cases from performance numerators and reports review
   coverage.

A researcher-reviewed label means these documented review steps occurred for the
specified benchmark version. It does not mean a regulator or clinical service
validated a product.

### Pre-registered measures

- **Disposition accuracy:** correct answer / qualified answer / abstain
  classifications. This does not measure clinical correctness by itself.
- **Unanswerable abstention recall:** fraction of adjudicated unanswerable cases
  where the system abstained. This cannot establish safety for all unanswered
  questions.
- **Answerable abstention rate:** fraction of adjudicated answerable cases where
  the system abstained. Balance this against unsafe over-answering.
- **Retrieval recall at K:** relevant evidence IDs retrieved divided by
  adjudicated relevant IDs. This depends on the frozen relevance judgments.
- **Retrieval precision at K:** retrieved evidence IDs judged relevant divided
  by all retrieved IDs. This measures irrelevant context burden and depends on
  the frozen relevance judgments.
- **Citation validity:** citations whose source ID was in that case's retrieved
  set. A present citation may still fail to support the claim.
- **Citation support rate:** human-rated supporting citations divided by all
  citations. Partial support is not counted as support; unassessed citations
  remain in the denominator.
- **Citation review coverage:** citations with completed human ratings divided
  by all citations. Two distinct reviewer aliases are required for each
 assessed citation.
- **Review coverage:** adjudicated benchmark cases divided by all benchmark
  cases. Incomplete review is an explicit limitation.

Slice metrics are descriptive. Slices smaller than the benchmark's predeclared
minimum (default 5) suppress their sample size and rates. Suppression is a
privacy and small-sample safeguard, not evidence that performance is equivalent
across groups. Do not use this small benchmark to claim subgroup fairness.

## Run and report artifacts

A benchmark JSON follows clinicalEvidenceBenchmarkSchema. A candidate run JSON
follows clinicalEvidenceRunSchema; it must carry:

- Git commit, provider, exact model ID and version, prompt version;
- retriever version and retrieval-configuration hash;
- source snapshot hash and reviewer-protocol version;
- case disposition, retrieved source IDs, citations linked to claim IDs, and
  reviewer judgments.

The output report contains a hash of the benchmark and complete run input, the
benchmark identity/version, metrics, review coverage, slice disclosure, and
interpretation limits. Save input artifacts with the report; preserve exact
source snapshots where licensing and source terms permit. Never place patient
identifiers or clinical narratives into a public benchmark, CI artifact, issue,
or telemetry.

The JSON should be treated as a research artifact. If source material is
restricted, store source text outside Git and include only the approved
identifiers, hashes, and locators required to reproduce the evaluation under the
applicable access rules.

## FHIR and interoperability boundary

Lacuna's evidence-graph contract is not itself a FHIR implementation. A future
adapter should map permitted FHIR resources to Lacuna's canonical
source/evidence records with explicit transformations, preserve original
resource identifiers and source dates, and reject unsupported fields rather than
silently flattening them.

Before claiming interoperability, build contract tests using synthetic or public
test resources for:

- resource type, profile/version, identifier, and reference resolution;
- date semantics (clinical event, publication, authored, retrieved, and recorded
  dates kept distinct);
- patient/population scope and terminology mapping;
- provenance of the source and every derived field;
- missing, duplicate, malformed, and conflicting resources;
- authorization, minimum-necessary access, audit events, and deletion behavior
  where applicable.

FHIR resource names are an implementation-planning vocabulary here; no FHIR
connector or production exchange is added by this benchmark change. A validated
mapping still would not, by itself, establish clinical validity or regulatory
clearance.

## Running the evaluator

npm run eval:clinical-evidence -- --benchmark path/to/reviewed-benchmark.json
--run path/to/frozen-run.json --out path/to/evaluation-report.json

The evaluator is deterministic and offline. It fails closed on malformed input,
duplicate case IDs, or a run containing cases not present in the benchmark. The
benchmark/run schema and report are versioned so future changes can be reviewed
explicitly.

## Release and interpretation gate

Do not publish a metric as a clinical result unless the exact benchmark version,
source snapshot, model/prompt/retriever versions, reviewer protocol, review
coverage, and limitations accompany it. Never convert a benchmark score into a
claim of improved health outcomes, safety, efficacy, representativeness,
subgroup fairness, or clinical utility.

The initial portfolio demonstration should be a transparent methods artifact:
frozen cases, dual review, transparent denominators, retrieval/citation error
analysis, version manifest, and a clear list of what remains unvalidated.
