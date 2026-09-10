# MeshIC Findings Summary

This branch converts the September 10, 2026 Lacuna data audit into fail-closed engineering controls.

## Why this exists

Lacuna contains strong existing transparency patterns, but several precise outputs were more authoritative-looking than their evidence supported. The remediation philosophy is simple: **missing is better than wrong, provenance cannot be upgraded by completeness, and disagreement/weak evidence should escalate to primary-source diligence rather than another model vote.**

## Highest-risk issues addressed

- incorrect/stale SEC CIK identity mappings and post-acquisition standalone revenue histories;
- unweighted CMS reimbursement aggregation and undocumented fallback observations;
- financing-to-valuation annualizations mislabeled as company CAGR;
- source-quality grades being upgraded by record completeness;
- `dealValue / totalFunding` mislabeled as MOIC;
- uncalibrated OAIS composite presented with more decision authority than its inputs warrant;
- dual-attestation checks that counted source strings without testing resolvability/independence;
- widespread missing economic vintages and display-level provenance coverage.

## Product stance after remediation

Lacuna remains useful as a research and diligence platform. Decision-grade promotion requires stronger field-level evidence, exact vintage, reproducible lineage, and calibration appropriate to the claim. The branch intentionally withholds affected outputs until those conditions are met.
