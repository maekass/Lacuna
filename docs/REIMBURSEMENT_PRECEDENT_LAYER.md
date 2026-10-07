# Reimbursement Precedent Layer

## Why this belongs in Lacuna

Lacuna's reimbursement work should not only ask whether a women's-health payment
gap exists. It should also ask **what kind of economic failure it is**, whether
that failure appears elsewhere, and which payment, policy, or capital mechanisms
have already changed similar economics.

This precedent layer turns women's-health reimbursement from an isolated
advocacy claim into a comparative institutional-research problem:

```text
observed women's-health gap
-> structural confounder decomposition
-> comparator market or specialty
-> precedent mechanism
-> measurable outcome
-> transferability test
-> residual sex-specific component
```

The comparator is evidence for mechanism design, not proof that the same
intervention will work in women's health.

## Initial analytical framework

The first framework decomposes a reimbursement gap into three structural drivers
before attributing the remainder to a sex-specific effect:

| Driver                          | Question                                                                                 | Initial comparators                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Payer mix                       | Is the observed gap partly explained by a high Medicaid or other low-paying payer share? | Pediatrics, rural hospitals                            |
| Cognitive vs procedural billing | Is time-intensive counseling/evaluation undervalued relative to procedures?              | Psychiatry, geriatrics, primary care                   |
| Standby capacity cost           | Does the service require continuous staffing that per-unit payment does not support?     | Emergency departments, trauma centers, rural hospitals |

The residual test is to benchmark OB/GYN against comparator specialties on
revenue per clinical hour, payer mix, and network participation. Any remaining
gap is a better candidate for a sex-specific reimbursement penalty than the
unadjusted difference.

## Women's-health anchors

The seed dataset contains four direct anchors:

- Medicaid finances about four in ten U.S. births.
- Comparable procedures on female anatomy have been reported as reimbursed
  materially below procedures on male anatomy in U.S. Medicare.
- A similar female-vs-male surgical reimbursement gap has been reported in
  Canada.
- Maternity-care deserts provide a direct example of standby-capacity economics
  and provider exit.

These anchors should enter Lacuna only as source-linked claims with explicit
vintage and review state.

## Precedent library

The initial cases span three useful classes:

### Precedent success

A payment, policy, or capital mechanism measurably changed the economics of an
underfunded area.

Seed cases:

- Cystic Fibrosis Foundation venture philanthropy
- Critical Access Hospital cost-based reimbursement
- Orphan Drug Act incentives
- Osteoporosis quality incentives in Medicare Star Ratings
- Medicaid 12-month postpartum coverage extension
- Medicare ESRD entitlement

### Cautionary precedent

A reimbursement change reduced access or participation and therefore shows the
mechanism in reverse.

Seed case:

- Medicare DXA reimbursement cuts and the subsequent decline in testing

### Structural mirror

A different market exhibits the same financial failure pattern and can be used
to test mechanism transferability.

Seed cases:

- Sickle-cell vs cystic-fibrosis funding
- Psychiatry insurance participation
- Dental annual maximums
- California FAIR Plan / insurer-of-last-resort concentration
- Cash-pay veterinary medicine and low insurance penetration

## Institutional use inside Lacuna

This layer is most useful when it changes a diligence question from:

> Why is women's health under-reimbursed?

to:

> Which share of the observed gap is explained by payer mix, cognitive-care
> valuation, or standby-capacity economics; what comparable markets have already
> addressed that mechanism; and what residual remains after controlling for
> those factors?

That framing is more decision-useful for payers, policymakers, health systems,
foundations, and investors because it separates diagnosis from mechanism
selection.

Potential Intelligence outputs:

- **Mechanism map** — observed women's-health problem -> comparator ->
  policy/payment mechanism -> outcome
- **Transferability card** — what matches, what does not, and which assumptions
  must hold
- **Residual-gap analysis** — structural confounders removed before labeling a
  gap sex-specific
- **Precedent evidence table** — source, vintage, metric, review state, and
  caveat
- **Policy-design prompts** — candidate mechanisms to investigate, never
  automatic recommendations

## Evidence boundary

This is **context / intelligence evidence**, not verified M&A data and not a
causal model.

Every precedent claim should carry:

- source ID and locator
- source date / data vintage
- metric unit
- verification status
- explicit comparator logic
- transferability caveat
- reviewer state under the reimbursement evidence workflow

Rows marked `needs_verification` must not be surfaced as publication-grade
claims until promoted through the reimbursement evidence states:

`machine_proposed -> source_verified -> specialist_reviewed -> approved -> published`

The system must not infer that because a mechanism worked in one domain it will
work in women's health.

## Source dataset

The seed supplied on 2026-10-05 is titled
`womens-health-reimbursement-precedents` (version 0.1.0). It defines:

- a confounder-decomposition framework,
- four women's-health anchor metrics,
- twelve cross-sector precedent cases,
- source IDs and verification statuses,
- explicit women's-health parallels for each case.

The next implementation step should normalize this source into the reimbursement
evidence domain model, preserving the original case type and verification state
rather than promoting it directly into a public-facing claim surface.
