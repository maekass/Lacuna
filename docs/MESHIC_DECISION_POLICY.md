# MeshIC Decision Policy

A material Lacuna output is **decision-grade** only when all applicable checks pass:

1. **Identity** — the entity being measured is unambiguously resolved.
2. **Provenance** — the exact field has a canonical source or filing identifier.
3. **Definition** — the displayed label matches the quantity actually computed.
4. **Vintage** — the economic/clinical value has an explicit as-of or event date.
5. **Lineage** — derived values are reproducible from cited inputs.
6. **Evidence class** — assumptions, synthetic data, proxies and aggregators cannot be promoted by record completeness.
7. **Uncertainty** — statistical intervals describe only the uncertainty they actually estimate and do not erase coverage/selection bias.
8. **Calibration** — model-derived rankings/confidence are not called predictive until validated on appropriate held-out or observed outcomes.
9. **Escalation** — high materiality + disagreement + weak evidence routes to primary-source/human diligence, not majority-model voting.

When a check fails, the preferred state is **withheld/null with an explanation**, not a fallback number presented at equal visual authority.
