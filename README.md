<!--
SEO Meta Description: Lacuna — an evidence layer for understanding how capital is structured around scientifically complex healthcare assets. Women's health is the initial research laboratory, spanning clinical evidence, population health, creative financing, governance, M&A, and IPO/strategic outcomes.
-->

<h1 align="center">Lacuna</h1>

<p align="center">
  <strong>An evidence layer for science, capital structure, governance, and strategic outcomes in healthcare</strong>
</p>

<blockquote align="center">
  <p><strong>Women's health is the initial laboratory · public-source evidence · creative financing · capital structure · governance · M&amp;A / IPO pathways · Not investment advice.</strong></p>
</blockquote>

<p align="center">
  <a href="https://lacuna-maekass.vercel.app">
    <img src="./public/social-preview.svg" alt="Lacuna — women's health M&A diligence with a source-linked deal network" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-C8A8E9?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-D4A5E0?style=flat-square&logo=react&logoColor=white" alt="React 19"></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-E8B4D9?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-24-C8A8E9?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 24"></a>
  <a href="https://d3js.org"><img src="https://img.shields.io/badge/D3.js-v7-C9A0DC?style=flat-square&logo=d3.js&logoColor=white" alt="D3.js v7"></a>
  <a href="docs/MODEL_CARD.md"><img src="https://img.shields.io/badge/Scores-descriptive_only-E8B4D9?style=flat-square" alt="Descriptive scores only"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL_1.1-B19CD9?style=flat-square" alt="BSL 1.1"></a>
  <a href="https://lacuna-maekass.vercel.app"><img src="https://img.shields.io/badge/Demo-Vercel-C8A2C8?style=flat-square&logo=vercel&logoColor=white" alt="Live demo"></a>
</p>

## What Lacuna is

Lacuna is a **research infrastructure layer for reconstructing how capital is structured around scientifically complex healthcare assets**.

The project began with women's-health M&A and commercialization. The deeper problem is the research workflow underneath it: important evidence is public, but it is fragmented across filings, clinical-trial registries, scientific literature, regulatory records, company investor-relations pages, transaction announcements, spreadsheets, and—where authorized—commercial financial datasets.

The bottleneck is often not access to a single source. It is the **time and cognitive cost of moving across sources, resolving entities, reconstructing chronology, deciding what is evidence versus inference, and preserving enough provenance that another analyst can reproduce the work**.

Lacuna is designed around that problem.

### The thesis

> **Turn fragmented healthcare information into a traceable, queryable evidence layer so analysts can spend less time collecting and reconciling documents and more time understanding what the evidence means.**

The underlying research chain is:

**Science → clinical evidence → population need → capital → financing structure → governance/control → strategy → outcome**

Lacuna does not assume that public information is proprietary. Its thesis is that **structured synthesis can be more useful than fragmented access**.

The system is therefore designed to answer questions such as:

- What was knowable about an asset or company at a particular point in time?
- What changed between two financing or strategic events?
- Which clinical, scientific, regulatory, or commercial observations were available before a transaction?
- How did the financing instrument affect dilution, governance, control, runway, or strategic optionality?
- What relationships become visible when evidence from multiple public sources is resolved to the same canonical entity?
- Which conclusions are directly observed, which are derived, and which remain hypotheses?

### What Lacuna is — and is not

Lacuna is **not** intended to become another healthcare data terminal, a private-markets database, or a replacement for licensed providers such as PitchBook or Preqin.

It is also not an argument that putting public documents into an LLM creates an information advantage.

Instead, Lacuna aims to provide a **controlled, provider-agnostic research layer** that can work with:

- public and reproducible sources;
- structured exports such as CSV or Excel;
- public-market data;
- and, eventually, authorized proprietary datasets supplied by an analyst or institution.

Where a firm already pays for a financial-data provider, Lacuna's role can be complementary: **connect licensed financial data to scientific, clinical, regulatory, reimbursement, population, governance, and transaction evidence without redistributing the licensed records**.

The long-term value proposition is therefore less about record count and more about **entity resolution, temporal reconstruction, provenance, evidence linkage, and research workflow**.

### Why this matters for institutional research

Institutional research teams may already be permitted to use the underlying public sources. The practical problem is that an analyst can spend hours moving between Google, SEC EDGAR, ClinicalTrials.gov, PubMed, FDA, company IR, investor presentations, transaction documents, and internal spreadsheets just to reconstruct one coherent timeline.

Lacuna is designed to make that workflow more systematic:

**Research question → source retrieval → entity resolution → evidence normalization → point-in-time timeline → cross-source connections → analyst interpretation**

The AI interface belongs at the end of this chain, not at the foundation of it.

That distinction matters. The underlying evidence model should remain useful if the language model changes, and a reviewer should be able to trace an AI-assisted answer back to the observations and sources that support it.

This also creates a cleaner institutional boundary: **source permissions, licensed-data restrictions, provenance, retention, access controls, and model usage can be handled as properties of the research system rather than improvised each time an analyst opens a general-purpose chatbot.**

This is an architectural and workflow objective—not a claim that an in-house deployment is automatically compliant. Any institutional implementation still depends on the firm's policies, contracts, security controls, source terms, and governance.

### The research question

The core question is:

> **Given what was knowable about an underlying healthcare asset at time T, how did changes in evidence, risk, capital structure, governance, and strategy interact—and what could a sufficiently systematic analyst have inferred from the information available then?**

That requires **point-in-time reconstruction**. Later outcomes should not silently become evidence for earlier decisions.

Women's health is the initial laboratory because it provides a focused domain in which these relationships can be reconstructed carefully. The architecture is intended to generalize to precision medicine, oncology, orphan drugs, diagnostics, devices, and other scientifically complex healthcare markets.

### Creative financing as a first-class dimension

Lacuna treats financing instruments as part of the research object rather than metadata attached to a company.

Relevant structures can include equity, venture and growth financing, strategic investment, debt, royalty or revenue interests, licensing, milestone structures, asset transactions, recapitalizations, IPOs, acquisitions, and other structured arrangements.

The analytical question is not simply **who funded or acquired whom?** It is how the financing structure interacted with the underlying scientific and commercial risk.

That makes capital structure, governance, and strategic optionality part of the same longitudinal evidence model.

## The Lacuna architecture

Lacuna is organized as four layers. Each layer has a different job, and the separation is intentional.

### 1. Sources layer — where the evidence comes from

The sources layer ingests or references the systems analysts already use:

**SEC EDGAR / XBRL · FDA / openFDA · ClinicalTrials.gov · PubMed / NCBI · OpenAlex · CDC / CMS / Census · company IR and press releases · merger and financing documents · public investor disclosures · CSV / Excel · authorized financial-data exports**

The goal is not to own every source. It is to make source boundaries explicit and preserve the provenance of every important observation.

### 2. Evidence layer — what the source actually tells us

The evidence layer turns documents and records into normalized observations:

**entities · identifiers · events · dates · metrics · populations · geography · source locators · evidence type · confidence · point-in-time semantics**

This is where company names, investors, trials, publications, assets, transactions, institutions, and other entities become connected.

The evidence layer should preserve the difference between:

- directly observed facts;
- derived fields;
- analyst assumptions;
- heuristics;
- and model-generated interpretation.

### 3. Research layer — what becomes analyzable

The research layer connects observations into longitudinal cases:

**clinical trajectory · scientific evidence · regulatory trajectory · population need · financing · ownership · governance · reimbursement · strategic relationships · M&A · IPO pathways · outcomes**

This is where the system can reconstruct a company's or asset's changing information set rather than treating each document as an isolated record.

### 4. Intelligence interfaces — how an analyst uses it

The interface layer turns the evidence graph into research workflows:

**search · timelines · deal dossiers · financing maps · evidence graphs · entity pages · comparative cases · question answering · exports · AI-assisted synthesis**

The interface should help an analyst move from **question → evidence → interpretation**, while keeping the underlying evidence inspectable.

### The design principle

**The AI is an interface to the evidence layer, not a substitute for the evidence layer.**

That is the architectural distinction Lacuna is trying to preserve.

## Scope: sex-specific biology within women's health

For Lacuna, **women's health is not a synonym for every product, service, or company marketed to women**. The primary scope is **sex-specific biology**: anatomical, physiological, genetic, and hormonal differences between females and males that affect organ systems, disease biology, clinical presentation, therapeutic response, risk, diagnosis, or outcomes.

This distinction is deliberate. The research scope is intended to follow **biological and clinical specificity**, not consumer demographics or branding.

Accordingly, Lacuna prioritizes healthcare assets and financing questions where sex-specific biology is materially relevant to the underlying scientific or clinical thesis. Examples can include reproductive and gynecologic disease, sex-linked disease mechanisms, female-specific manifestations or treatment responses, hormonal biology, biomarkers, therapeutics, diagnostics, devices, and other technologies where the biological distinction is part of the evidence.

The scope does **not** attempt to survey the entire women's-health market. In particular, Lacuna is not intended to become a general catalog of fertility products, hormone-replacement products, consumer wellness, home diagnostic tools, service businesses, or other offerings simply because they are marketed primarily to women. Products or services that substitute for or shift care traditionally delivered in settings such as neonatal intensive care are likewise outside the core research scope unless a specific sex-specific biological question makes them analytically relevant.

This boundary keeps the project focused on a narrower and more technically defensible research problem: **how sex-specific biology creates clinical risk, evidence requirements, financing constraints, and strategic opportunities—and how capital structures respond to those conditions**.

## Public-source research and information synthesis

Lacuna is deliberately built around **publicly available, reproducible evidence**.

For public companies and public-market research, the relevant information set is often necessarily grounded in public disclosures: regulatory filings, earnings materials, investor presentations, clinical-trial registries, scientific literature, regulatory actions, company announcements, and other observable records. Lacuna treats the shared availability of these sources as a feature of the research problem rather than a reason to compete on proprietary data volume.

The research objective is therefore not to possess information that nobody else can access. It is to **extract signal from the same underlying public information set through better structure, entity resolution, temporal reconstruction, evidence linkage, and domain-specific modeling**.

That creates a useful distinction:

- **Raw data:** a filing, trial record, paper, financing announcement, regulatory action, or transaction disclosure.
- **Structured evidence:** the same observation normalized, time-stamped, linked to canonical entities, and preserved with provenance.
- **Research signal:** relationships or patterns that become visible only after multiple public sources are connected.
- **Case-specific model:** a transparent analysis of how the evidence available at a historical point in time could have informed a financing, strategic, clinical, or market hypothesis.

This is an **information-synthesis and research-infrastructure problem**, not a claim of privileged information or a substitute for licensed private-market datasets.

Where an analyst or institution already has authorized access to proprietary sources such as PitchBook, Preqin, or other financial-data providers, Lacuna can eventually serve as an enrichment and evidence layer around that licensed data. It is not intended to redistribute proprietary records or replicate a provider's commercial dataset.

## Data sources and provenance

Lacuna favors **primary, public, and reproducible sources** wherever practical. Source selection depends on the question and may include:

| Source class | Examples | Typical role |
| ------------ | -------- | ------------ |
| Public-company filings | SEC EDGAR, company filings, XBRL | Financials, ownership, transactions, risk factors, governance, disclosures |
| Scientific literature | OpenAlex, PubMed/NCBI, Crossref and linked identifiers | Publications, authors, institutions, citations, scientific context |
| Clinical evidence | ClinicalTrials.gov and other public registries | Trial design, status, endpoints, sponsors, investigators |
| Regulatory | FDA, openFDA, other public regulatory records | Approvals, warnings, safety, devices, regulatory milestones |
| Population and utilization | CDC, CMS, Census and other public statistical sources | Epidemiology, utilization, population, reimbursement context |
| Transaction evidence | Press releases, investor relations, merger documents, public filings | Financing, M&A, strategic transactions, disclosed consideration |
| Investor and fund disclosures | Public portfolio pages, filings, institutional disclosures | Ownership and investment relationships where publicly disclosed |

These sources are not treated as interchangeable. Lacuna records **which source supports which observation**, preserves source locators where available, and distinguishes directly observed facts from derived fields, heuristics, and analyst assumptions.

For example, OpenAlex provides a public scholarly metadata graph covering works, authors, sources, institutions, funders, topics, and related identifiers; its API is available for basic use without a key and its data is published under CC0. SEC EDGAR likewise provides public access to filings and APIs for company submissions and extracted XBRL data.

**Public-source does not mean low-quality by default.** It means the research process should be auditable: a reviewer should be able to understand where an observation came from, what was knowable at the relevant point in time, what was inferred, and where uncertainty remains.

The project therefore treats **provenance, point-in-time semantics, source hierarchy, and reproducibility as part of the data model**, not documentation added after the analysis.

The product app runs on **Vercel** from this repository. A separate **Framer** site is brand and narrative only, with one call to action into the app — [SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md).

**Live demo:** [lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app)

## Integrity boundaries

| Boundary                              | What that means here                                                                                                                                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not a live institutional terminal     | Default data is the committed file `src/data/dataset.verified.json` (dataset v9). It is a convenience sample with public citations, not PitchBook, a data SLA, or a census of women’s-health M&A.                                                                                 |
| Not advice                            | The app does not provide investment advice, clinical guidance, treatment recommendations, or patient-specific interpretation.                                                                                                                                                     |
| Scores stay descriptive               | Exit Similarity Explorer and the comparables panel are hand-weighted indexes on this catalog. They are not predictions, probabilities, forecasts, calibrated models, enterprise valuations, or expected returns. Read [MODEL_CARD.md](docs/MODEL_CARD.md) before citing a number. |
| No causal claims                      | `/methods` reports record quality, sector counts, and announcement timing. It does not identify causal effects, treatment effects, or Bayesian causal estimates.                                                                                                                  |
| Trial models withheld                 | Offline clinical-trial classifiers exist in the repo. Percentages stay off the public UI while `trainingSource` is `synthetic_seed`. Live trial **search** (ClinicalTrials.gov) is separate and is not a model score. See [ML_CLINICAL_TRIALS.md](docs/ML_CLINICAL_TRIALS.md).    |
| No synthetic rows in the deal product | Public deal counts, networks, and disclosed-value totals come from the verified JSON. Staging, seed files, and illustrative heuristics are not merged into those figures. See [DATA_BOUNDARIES.md](docs/DATA_BOUNDARIES.md).                                                      |

When a field is missing, panels show insufficient disclosed data. They do not fill gaps with TAM/SAM, sector-multiple fallbacks, or editorial stage medians.

## What you can do in the app

| Workspace       | Route           | Role                                                                                                                                                              |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deals           | `/deals`        | Source-linked network, announced-year activity, disclosed-value matrix, acquirer patterns, comparable context, similarity bands                                   |
| Consumer health | `/consumer`     | Same catalog, filtered to wearables, wellness apps, and consumer digital health                                                                                   |
| Deal dossier    | `/deals/[id]`   | One verified transaction and its citations. Name-search trials, FDA, and CMS results are not attached unless a reviewer has keyed a public NCT or CPT citation    |
| Payer Ops       | `/payer-ops`    | Prior-authorization and claims-ops context plus venture signals computed from the verified catalog                                                                |
| Research        | `/research`     | Trial search, evidence-maturity and burden context, health-equity markers, optional genetics browser. Heuristics here are labeled and do not feed deal economics  |
| Intelligence    | `/intelligence` | Reimbursement questions, precedent maps, and dataset export. Fit scores are affinity, not premiums or comps                                                       |
| Methods         | `/methods`      | Record-quality grades, observed sector composition, and announcement timing on the verified set. This page does not publish causal effects or Bayesian posteriors |

| Pinned catalog fact                    | Role in the public app                  |
| -------------------------------------- | --------------------------------------- |
| **51 medicine & biotech acquisitions** | Default Deals scope                     |
| **8 consumer health acquisitions**     | `/consumer` filter of the same file     |
| **46 fund portfolio investments**      | Overlays, not extra closed acquisitions |
| 50 of 59 deals                         | Rows that disclose a price              |

## Capital, creative financing, and transaction evidence

Lacuna treats transactions as more than rows in a deal database. A financing event can change dilution, governance, control, runway, strategic rights, and the set of future options available to an asset or company.

The research model is designed to capture:

- **Asset:** disease, mechanism, biomarker, technology, clinical stage, regulatory status.
- **Evidence:** publications, trials, endpoints, investigators, institutions, clinical milestones, and evidence strength.
- **Population:** burden, unmet need, affected populations, disparities, and market-access context.
- **Capital:** equity, debt, strategic investment, venture/growth rounds, royalty or revenue financing, licensing, milestones, and other structured instruments.
- **Governance:** ownership, board or voting rights, conversion mechanics, liquidation preferences, strategic rights, and changes in control where disclosed.
- **Strategy:** partnerships, licensing, asset sales, acquisitions, IPOs, recapitalizations, and other strategic pathways.
- **Outcome:** subsequent financing, commercialization, acquisition, public-market transition, licensing, restructuring, or failure/continuation.

The current public catalog remains a curated sample rather than a census. Its purpose is to establish the evidence and provenance infrastructure needed to reconstruct these relationships responsibly.

- n=59 verified deals · 150 companies · 38 acquirers.
- `dataset.verified.json` v9 (`provenance.lastUpdated: 2026-09-20`).
- Sources are public: SEC filings, press releases, investor relations, and fund portfolio listings, graded in [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md). Promotion does not invent sector, headquarters, or founded year.
- Disclosed-value headlines are **sums of observed prices** on completed women’s-health deals that published a number. They are not total market volume. Current pinned figures and the sampling frame are in [LIMITATIONS.md](docs/LIMITATIONS.md). Coverage against an external exit list is an observed ratio, not a capture-recapture estimate.
- Acquirer panels report counts, sector mix, timing, and disclosed size. They do not infer strategy, synergies, or the next target. See [COMPETITIVE_ANALYSIS_METHODOLOGY.md](docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md).

## Creative Financing Atlas

A longer-term research direction is a **Creative Financing Atlas**: a carefully reconstructed set of healthcare transactions in which the financing instrument itself is analytically important.

The initial unit of analysis is not simply a company or funding round. It is the relationship between an underlying asset's changing risk profile and the capital structure used to finance it.

Questions the evidence layer is designed to support include:

- How did financing structures change as clinical risk declined?
- When did strategic investment, licensing, royalty/revenue financing, or structured capital appear relative to clinical milestones?
- Did governance or control change as an asset moved from scientific risk toward commercial risk?
- What capital structures appeared around companies approaching an IPO or strategic transaction?
- Which information was observable **before** a major transaction, rather than only after the outcome?
- How did scientific validation, regulatory events, reimbursement evidence, and population need interact with financing choices?

These are research questions, not predictive claims. Lacuna does not infer undisclosed motives, assign investment recommendations, or treat a financing structure as proof of an outcome.

## A canonical research workflow

A useful Lacuna case should be reconstructable as a sequence of information states rather than a single transaction row.

### Example: following an asset from pre-Series B to acquisition

**Pre-Series B**

What was knowable before the financing?

- What was the scientific thesis?
- What publications supported it?
- What clinical trials were active?
- What were the relevant endpoints and enrollment signals?
- What regulatory milestones had occurred?
- What population need or reimbursement constraints were observable?
- Who were the existing investors and strategic relationships?
- What capital had already been deployed?

↓

**Series B**

What changed when new capital arrived?

- Who provided the capital?
- What instrument was used?
- How much was raised?
- Was valuation disclosed?
- What dilution or ownership change was observable?
- Were there board, voting, conversion, liquidation, or strategic rights?
- What use of proceeds was stated?
- Which clinical or regulatory milestone was the financing intended to reach?

↓

**Post-Series B**

What happened after the financing?

- Did the clinical program advance?
- Did new evidence appear?
- Did regulatory status change?
- Did a strategic investor or partner appear?
- Did additional financing occur?
- Did governance or ownership change?
- Did the company shift from scientific validation toward commercialization?

↓

**Acquisition / IPO / strategic outcome**

What became observable at the next major transition?

- What was the transaction structure?
- Who controlled the asset?
- What consideration was disclosed?
- What strategic rationale was publicly stated?
- Which prior scientific, clinical, regulatory, and financing observations were already knowable?
- Which relationships only became visible in hindsight?

The point is not to manufacture a causal story after the fact. The point is to preserve the information set at each stage and distinguish **observation, inference, and hypothesis**.

### Questions the research layer should make easier

**Clinical risk**
- What evidence existed at each financing date?
- Did financing structure change as clinical uncertainty changed?

**Capital structure**
- Which instruments were used at different stages of risk?
- How did capital providers differ across scientific, clinical, and commercial phases?

**Governance**
- When did ownership, board representation, voting power, conversion rights, or strategic rights change?

**Strategic behavior**
- Did strategic investment, licensing, partnership, or acquisition follow identifiable evidence milestones?
- What relationships existed before the transaction rather than appearing only in the transaction announcement?

**Market access**
- What reimbursement, utilization, pricing, or population evidence was available before commercialization or strategic activity?

**Point-in-time research**
- What could an analyst reasonably have known at T?
- Which information entered the public record only afterward?
- Which conclusions are robust to removing hindsight?

## Research and reimbursement context

**Clinical trials.** `/api/clinical-trials` searches ClinicalTrials.gov. That volume is not deal coverage. Model-derived women’s-health relevance and completion-proxy badges are withheld until training uses live registry labels rather than the synthetic seed artifact.

**Reimbursement.** Source-traceable fee-schedule and coverage questions live under `src/lib/reimbursement/` and ship only after review. Older multiple tables (for example insurance-driven versus consumer-only “premiums”) are unsupported rules of thumb and are not analytical output. See [REIMBURSEMENT_INTELLIGENCE.md](docs/REIMBURSEMENT_INTELLIGENCE.md).

**Health equity.** Marker panels cite published disparity statistics (CDC, ACS, and similar). They are context. They are not market sizing or allocation advice.

**Narratives.** Optional copy from `POST /api/ai/insights` uses Vercel AI Gateway when a key is configured and returns 503 otherwise. Narrative text does not override dataset fields or heuristic labels. See [INFERENCE.md](docs/INFERENCE.md).

## US Evidence Graph

The **US Evidence Graph** is a separate research layer for source-linked regulatory, surveillance, claims, trial, epidemiology, funding, pricing, and workforce observations. It does not merge research observations into `dataset.verified.json`.

Each promoted observation preserves its subject and metric, value plus any comparator, primary source and locator, geography and population when known, point-in-time `asOf` semantics, evidence type, and limitations. Historical snapshots use source publication dates to prevent future-information leakage.

The first vertical slice covers **ferric carboxymaltose (Injectafer)**. It preserves the August 2026 FDA supplement adding a boxed warning for symptomatic hypophosphatemia and FDA's September 2026 Sentinel statement that serum-phosphate testing occurred in **fewer than 20%** of administration episodes. The latter is stored as an upper bound (`value: 0.2`, `comparator: "lt"`), not as an exact 20% rate.

The ingestion foundation also includes a typed openFDA device client for 510(k), PMA, adverse-event, recall, UDI, and classification endpoints, plus a federal source catalog for FDA postmarketing requirements/commitments, CDRH real-world-evidence precedents, women-specific devices, and openFDA.

**Translation boundary:** US evidence can generate a deployment question or constraint for a target-market case, but it must not silently become a non-US parameter. US utilization is not non-US uptake; US reimbursement is not non-US price; and US surveillance results require separate applicability evidence before translation.

See [EVIDENCE_GRAPH.md](docs/EVIDENCE_GRAPH.md) for the evidence contract and [MARKET_ACCESS.md](docs/MARKET_ACCESS.md) for the separate deterministic demand and budget-impact workbench.

## Therapeutics ontology

A separate therapeutics graph sits beside the verified acquisition dataset. It does not replace those deals. The first reference vertical is **endometriosis**. It is a curated, source-linked demonstration of disease, asset, trial, regulatory, and catalyst records. It is not yet a comprehensive therapeutics database, and it does not produce an investment score or an rNPV.

Normalized ClinicalTrials.gov studies and FDA regulatory events keep their source identifiers. Historical snapshots use publication dates, so a later document does not become evidence for an earlier date. Analyst assumptions stay on an investment-thesis object and are not written into the evidence layer.

Developer inspection: `/therapeutics/endometriosis` (noindex). See [THERAPEUTICS_ONTOLOGY.md](docs/THERAPEUTICS_ONTOLOGY.md).

## Roadmap

The roadmap is deliberately layered. Each stage should make the next stage more useful; the project should not accumulate features without strengthening the underlying research model.

### Phase 1 — Establish the evidence foundation

**Goal:** make public-source research reproducible.

- Define canonical entities and external identifiers.
- Normalize source-specific records.
- Preserve provenance and source locators.
- Establish point-in-time semantics.
- Separate observations from inference.
- Build source adapters for high-value public sources.
- Keep the verified public dataset small enough to audit.

**Success condition:** another analyst can reproduce a case timeline from the cited evidence.

### Phase 2 — Reconstruct research cases

**Goal:** move from a deal catalog to longitudinal asset and company research.

- Connect scientific literature to companies, assets, and trials.
- Connect clinical milestones to financing and strategic events.
- Model capital structure and governance explicitly.
- Build pre-event and post-event information sets.
- Develop the Creative Financing Atlas.
- Benchmark Lacuna against a manual research workflow.

**Success condition:** Lacuna materially reduces the time and reconciliation work required to reconstruct a complex healthcare case.

### Phase 3 — Add authorized financial context

**Goal:** enrich the evidence graph without becoming a proprietary-data vendor.

- Define provider-agnostic financial-data interfaces.
- Accept authorized CSV / Excel and structured exports.
- Support institutionally licensed datasets where permitted.
- Keep proprietary records segregated according to the relevant license.
- Map external provider identifiers to Lacuna canonical entities.

**Success condition:** an analyst can bring data they are already authorized to use and connect it to Lacuna's evidence graph without replacing the provider.

### Phase 4 — Research intelligence interfaces

**Goal:** make the evidence graph useful at analyst speed.

- Natural-language research questions.
- Source-linked answer generation.
- Point-in-time case reconstruction.
- Interactive timelines and transaction maps.
- Financing and governance views.
- Comparable-case exploration.
- Exportable research packages.
- Audit-friendly provenance and model/input logging.

**Success condition:** AI reduces research friction without obscuring the evidence underneath the answer.

### Phase 5 — Generalize beyond the initial laboratory

Women's health remains the first research laboratory, but the architecture should eventually support other scientifically complex domains where the interaction between evidence and capital matters.

Potential extensions include:

**precision medicine · oncology · orphan disease · diagnostics · devices · specialty therapeutics**

The domain should expand only when the underlying evidence model generalizes cleanly.

### What is explicitly not the roadmap

Lacuna is not trying to win by:

- accumulating the largest possible company database;
- reproducing PitchBook, Preqin, or another commercial provider;
- adding speculative valuation scores;
- making causal claims from observational timelines;
- turning every women's-health company into a row;
- or adding an AI chat box before the evidence model is trustworthy.

The priority is:

**evidence integrity → entity resolution → temporal reconstruction → research utility → interface speed**

## Stack

| Layer                                             | In the public app                                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Next.js 16, React 19, TypeScript, Tailwind CSS v4 | App shell. Node **24** (`.nvmrc`)                                                                                     |
| D3.js v7, Framer Motion                           | Network and charts                                                                                                    |
| `getVerifiedDataset()`                            | Default path; static JSON on Vercel                                                                                   |
| US Evidence Graph (`src/lib/evidenceGraph`)       | Point-in-time source-backed research observations; separate from verified M&A JSON                                    |
| Therapeutics ontology (`src/lib/therapeutics`)    | Asset-level disease graph. Endometriosis is the first reference vertical, not a full therapeutics database            |
| Market access (`src/lib/marketAccess`)            | Deterministic demand funnels and budget-impact scenarios                                                              |
| simple-statistics                                 | Descriptive summaries, cosine similarity, k-means labels                                                              |
| PostgreSQL                                        | Optional `LACUNA_DATA_MODE=db` — not required to run the demo                                                         |
| ClickHouse variant catalog                        | Optional and off by default. Not clinical-grade genomics. [GENOMICS_VARIANT_STORE.md](docs/GENOMICS_VARIANT_STORE.md) |

### Research-data layer

The application layer above is intentionally separate from the **research-data layer**. Lacuna uses public and licensed inputs as evidence sources, then normalizes them into a provenance-aware internal model.

Current and planned source adapters include:

- **OpenAlex** — scholarly works, authors, institutions, funders, topics, and identifiers.
- **PubMed / NCBI** — biomedical literature and identifiers.
- **ClinicalTrials.gov** — trial registry records and study metadata.
- **SEC EDGAR / XBRL** — public-company filings, submissions, and financial statement data.
- **FDA / openFDA** — regulatory, safety, device, and post-market evidence.
- **CDC / CMS / Census and other public statistical sources** — population, utilization, epidemiology, and reimbursement context.
- **Company IR, press releases, merger documents, and public investor disclosures** — transaction and financing evidence.
- **Authorized third-party financial datasets** — optional enrichment when an analyst or institution supplies data they are licensed to use; Lacuna does not redistribute those records.

The design principle is **source-agnostic, not source-indifferent**: each source has a defined role, provenance, identifier namespace, temporal semantics, and evidence quality. A source can be authoritative for one field and inappropriate for another.

The goal is not to accumulate the largest possible dataset. It is to build a **small, high-integrity, entity-resolved research graph** in which the connections between public observations reduce research friction and support reproducible case research.

**Checks:** `npm run lint` · `npm run typecheck` · `npm test` · `npm run deno:fmt:check` · `npm run deno:lint` · `npm run validate:dataset` · `npm run build:ci` (`LACUNA_DATA_MODE=static`).

## Quick start

```bash
git clone https://github.com/maekass/Lacuna.git
cd Lacuna
nvm use 24
npm install
npm run dev
```

Open `http://localhost:3000`. Optional Postgres and the variant store are documented in [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).

## Documentation

| Doc                                                                             | Use it for                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [MODEL_CARD.md](docs/MODEL_CARD.md)                                             | What each on-screen score is                         |
| [EVIDENCE_GRAPH.md](docs/EVIDENCE_GRAPH.md)                                     | US evidence contract and translation boundary        |
| [THERAPEUTICS_ONTOLOGY.md](docs/THERAPEUTICS_ONTOLOGY.md)                       | Endometriosis reference graph and evidence rules     |
| [MARKET_ACCESS.md](docs/MARKET_ACCESS.md)                                       | Demand, budget impact, and publication gate          |
| [LIMITATIONS.md](docs/LIMITATIONS.md)                                           | Disclosed-value definition and live totals           |
| [DATA_BOUNDARIES.md](docs/DATA_BOUNDARIES.md)                                   | Verified vs staging vs enrichment                    |
| [COMPETITIVE_ANALYSIS_METHODOLOGY.md](docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md) | Observable acquirer facts vs inferred intent         |
| [ML_CLINICAL_TRIALS.md](docs/ML_CLINICAL_TRIALS.md)                             | Why trial-model percentages are withheld             |
| [REIMBURSEMENT_INTELLIGENCE.md](docs/REIMBURSEMENT_INTELLIGENCE.md)             | What must not be published as reimbursement evidence |
| [INFERENCE.md](docs/INFERENCE.md)                                               | Optional server LLM                                  |
| [AGENTS.md](AGENTS.md)                                                          | Contributor conventions                              |

## License and author

[BSL 1.1](LICENSE). Research and education use is allowed. A commercial product that competes as women’s-health M&A intelligence needs a separate license ([mps5cy@virginia.edu](mailto:mps5cy@virginia.edu)). The license converts to Apache 2.0 in May 2030.

**[Mae Kass](https://github.com/maekass)** — MS/MPH; PsyD candidate; incoming MBA (2027). Signatory to the [G20 & G7 Health and Development Partnership H20 Call to Action](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf) (August 2024).
