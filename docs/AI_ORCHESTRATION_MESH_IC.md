# AI Orchestration Mesh — Internal Concept

**Status:** Internal architecture baseline  
**Version:** 0.1  
**Scope:** Janie Kass retinal-stroke evidence, pilot analytics, stakeholder outputs, and AI operations

## 1. Purpose

The mesh is a governed intelligence layer that routes each task to the model or deterministic component best suited to it, independently verifies high-risk claims, preserves source lineage, and only allows approved information to propagate into dashboards, pilot operations, and stakeholder communications.

The differentiator is not “many models.” It is controlled movement of evidence through a measurable decision system.

## 2. Runtime mesh

```text
USER / DATA EVENT
        |
        v
INTAKE + TRIAGE
intent • risk • privacy
        |
        v
SKILL ROUTER
        |
        +------------------+
        |                  |
        v                  v
PRIMARY MODEL       INDEPENDENT VERIFIER
        |                  |
        +---------+--------+
                  v
        CLAIM / OUTPUT JUDGE
       deterministic policy checks
             /          \
            /            \
           v              v
 APPROVED LEDGER     HUMAN REVIEW
           |
     +-----+------+----------+
     |            |          |
     v            v          v
 DASHBOARD     DECK/API    PILOT OPS
     \            |          /
      +-----------+---------+
                  |
                  v
           OPERATIONAL TRACE
        latency • cost • errors
        routing • reliability
```

## 3. State model

Every externally usable claim follows an explicit lifecycle:

```text
candidate → verified → approved → published → stale / superseded
```

Models cannot silently mutate canonical evidence. A source update creates a new candidate or supersession event.

## 4. Agent responsibilities

### Triage
Classifies task intent, skill, risk, privacy level, and allowed downstream paths.

### Evidence retrieval
Supplies only relevant approved evidence and source metadata. It does not give a model unrestricted authority to invent or broaden the evidence base.

### Primary reasoner
Produces structured candidate outputs containing the claim, source IDs, scope, confidence, and caveats.

### Independent verifier
Tests whether the cited evidence actually supports the proposed wording. For high-risk work, it should verify the claim independently rather than inheriting the primary model's rationale.

### Claim judge
A deterministic Python policy layer checks:
- source presence and evidence tier;
- geography and population scope;
- stale or superseded evidence;
- required caveats;
- prohibited interpretations;
- schema validity;
- privacy policy.

### Specialist agents
Consume approved claims for narrower tasks such as dashboard modeling, chart specifications, stakeholder writing, deck sync, or code generation.

### Evaluation agent
Scores outputs for evidence grounding, schema compliance, human acceptance, latency, privacy, and cost.

### Codex engineering layer
Codex evolves the mesh, adds tests and skills, investigates failed runs, implements integrations, and improves benchmarks. Codex is not the sole production judge or source of truth.

## 5. Routing policy

Routing is earned by measured task performance, not a static preference for one provider.

A target per-skill score is:

```text
0.35 evidence accuracy
+ 0.20 task benchmark
+ 0.15 privacy
+ 0.10 schema compliance
+ 0.08 human acceptance
+ 0.07 latency
+ 0.05 cost
```

Each skill can therefore select a different provider.

Example:

```text
evidence_synthesis     → strongest evidence-grounded reasoner
source_verification    → independent verifier
dashboard_modeling     → strongest data/code model
stakeholder_writing    → strongest constrained writer
high-risk final review → verifier + deterministic judge
```

## 6. Selective fan-out

Fan-out is risk-based rather than universal.

- Routine copy or formatting: one model.
- High-risk health claim: primary model + independent verifier.
- Ambiguous quantitative interpretation: multiple candidate analyses plus deterministic reconciliation where possible.
- Failed verification: re-route once, then escalate to human review.

This prevents “multi-agent” from becoming unnecessary cost and latency.

## 7. New-source workflow

```text
new source
→ parse
→ extract candidate claims
→ verify
→ compare with claim ledger
→ detect conflict / supersession
→ human approval where required
→ update canonical ledger
→ regenerate dashboard dataset
→ flag affected deck/API outputs
→ propose replacement language
→ approve
→ publish
```

No newer source silently overwrites an older one.

## 8. Pilot-data workflow

```text
new pilot data
→ schema validation
→ privacy gate
→ deterministic KPI calculation
→ AI interpretation of computed result
→ independent verification
→ dashboard refresh
→ operational telemetry
```

**Operating rule: Python computes the number; AI explains the number.**

The model should not be asked to calculate authoritative KPIs from raw rows when deterministic code can do so.

## 9. Evidence and health guardrails

- National clinical/public-health evidence supports the core thesis.
- State or regional evidence is an implementation / launch-market layer, not a national denominator.
- Pilot evidence measures the initiative itself and is not generalized beyond its design.
- A women's-health lens is supported where sources support it; a 51% female RAO cohort is not evidence of female predominance.
- Burden, association, implementation gap, and causality must remain distinct.
- Every material external health claim requires source lineage.

## 10. Privacy and observability

Datadog and orchestration traces are operational telemetry, not epidemiologic evidence.

Allowed telemetry includes:
- skill;
- provider;
- model;
- latency;
- errors;
- cost/tokens where available;
- route score;
- evidence/source count;
- release/version.

Do not send direct identifiers, full dates of birth, addresses, MRNs, free-text clinical notes, or unrestricted health narratives into telemetry.

## 11. Decision log

For each material output, preserve enough information to answer:

- Why did this claim appear?
- Which source(s) support it?
- Which model produced it?
- Which verifier checked it?
- Which deterministic rules passed or failed?
- Was human approval required?
- Which dashboard, deck, or API surface uses it?
- Has it been superseded?
- How did the route perform on benchmark, latency, and cost?

## 12. Product surfaces

The same approved claim layer can drive:

- internal evidence console;
- Tableau / Power BI datasets;
- pilot KPI reporting;
- stakeholder and fundraising deck language;
- public-facing educational material after appropriate review;
- technical APIs;
- source-refresh and stale-evidence alerts.

The technical routing/admin view should remain separate from the stakeholder-facing interface.

## 13. Near-term implementation sequence

1. Canonical claim ledger with review and supersession states.
2. Deterministic claim judge.
3. Benchmark fixtures for each AI skill.
4. LiteLLM provider adapters with per-skill evaluation.
5. Independent high-risk verification path.
6. Human-review queue.
7. Deck/dashboard sync from approved claims only.
8. Datadog operational telemetry and route-performance dashboard.
9. Scheduled source refresh and conflict detection.
10. Authenticated internal console as the system grows.

## 14. Definition of success

The mesh is successful when an institutional reviewer can trace every important output from **source → approved claim → model transformation → verification → publication**, while engineering can optimize model choice without changing the underlying evidence contract.
