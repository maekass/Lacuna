# LMIC market access workbench

**Status:** analytical workbench; no seeded country outputs.

This module extends Lacuna from investment diligence into transparent market-access
analysis. It is intentionally separate from `dataset.verified.json`: an LMIC
case is not an M&A record, and market-access assumptions must never alter the
verified deal dataset.

## Analytical chain

```text
target population
  × prevalence
  × service reach
  × diagnosis rate
  × treatment eligibility
= eligible population

eligible population × uptake = treated patients

annual budget =
  treated patients × (commodity cost + delivery cost)
  + fixed implementation cost
```

An intervention is compared with an explicit status-quo baseline. The workbench
reports additional patients reached, total annual budget, incremental budget,
and incremental cost per additional patient where the intervention expands
uptake.

These are **budget-impact and access calculations, not cost-effectiveness or
causal impact estimates**.

## Evidence contract

Persisted cases use `src/lib/marketAccess/schema.ts`. Every numeric input must
be one of:

- **observed** — directly reported by a cited source;
- **derived** — calculated from cited inputs with the formula recorded;
- **proxy** — indirect measurement with its limitation recorded;
- **assumption** — reviewer-owned analytical assumption with rationale, review
  date, and supporting evidence.

Rate fields are stored from 0 to 1. Currency fields are nominal USD unless a case
explicitly documents another transformation upstream.

## Maternal-anemia template

`src/data/market-access/maternalAnemiaTemplate.ts` deliberately contains **no
synthetic prevalence, pricing, uptake, or country values**. The first reviewed
case should select one LMIC and one commodity, then source:

1. population and maternal-anemia burden;
2. ANC/service reach and diagnosis pathway;
3. treatment eligibility and current uptake;
4. supplier/regulatory/price/capacity evidence;
5. procurement and financing context;
6. delivery and implementation costs.

The UI scratchpad accepts analyst-entered assumptions for scenario testing, but
those values are not evidence-backed, are not persisted, and must not be cited
as Lacuna research.

## Market-shaping scenarios

The schema supports status quo, price negotiation, pooled procurement, volume
guarantees, subsidy, leasing, and other explicitly documented mechanisms.
Scenario labels do not imply that a mechanism is feasible or advisable. A
reviewed case must document the mechanism, counterfactual, and evidence.

## Next acceptance gate

A country case is publishable only when:

- all modeled numeric fields pass the schema;
- all source URLs and locators are specific enough for independent review;
- supplier claims identify the product and geography;
- baseline and intervention uptake are clearly distinguished;
- budget outputs can be reproduced from the saved case; and
- a human reviewer signs off on assumptions.
