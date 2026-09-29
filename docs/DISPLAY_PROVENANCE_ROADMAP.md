# Display Provenance Roadmap

## Purpose

This roadmap turns the display-provenance audit into a staged remediation plan. It does not authorize adding invented sources, URLs, dates, or confidence labels merely to increase a coverage percentage.

## Baseline

The latest reviewed quality-visibility report found:

| Display-provenance status | Sites |
| --- | ---: |
| Covered | 21 |
| Exempt | 2 |
| Uncovered | 876 |
| Total monitored | 899 |
| Uncovered rate | 97.4% |

This baseline means the platform must not describe display-level provenance as universally implemented.

## Definitions

- **Covered:** The rendered claim or quantitative value exposes its applicable evidence, lineage, model provenance, or field-level citation.
- **Exempt:** The display is intentionally not an evidence-bearing claim, with a documented reason for exemption.
- **Uncovered:** The display appears to present an evidence-bearing fact, calculation, or claim without the required provenance path.
- **Withheld:** A potentially evidence-bearing value is intentionally omitted because the applicable supporting evidence is unavailable.

## Remediation order

1. **Economic figures and deal values.** Prioritize funding, valuations, acquisition values, premiums, and financial comparisons. Do not render an economic amount without the specific evidence path for that amount.
2. **Decision-oriented scorecards.** Prioritize rankings, screening outputs, comparables, and any surface likely to influence diligence or investment decisions.
3. **Clinical, demographic, and founder claims.** Add source attribution and clear evidence boundaries to claims about health outcomes, populations, demographics, and founder characteristics.
4. **Exploratory visualizations.** Add method, dataset, and caveat access to network, whitespace, strategic-positioning, and analytics visuals.

## High-volume audit targets

Start with the files carrying the largest known uncovered counts:

| File | Uncovered sites |
| --- | ---: |
| `src/components/NetworkAnalysisHonest.tsx` | 90 |
| `src/components/WhiteSpaceAnalysis.tsx` | 86 |
| `src/components/StrategicPositioningMap.tsx` | 61 |
| `src/app/sections/PayerOpsPage.tsx` | 49 |
| `src/components/FairnessAuditV2.tsx` | 46 |
| `src/components/CompetitiveAnalysisDashboard.tsx` | 33 |
| `src/components/FounderCharacteristics.tsx` | 33 |
| `src/components/GenderInferenceQuality.tsx` | 26 |

## Implementation standard

Prefer data-model and component-contract fixes over ad hoc text labels:

- Store field-level source, date precision, lineage, and caveat information next to the underlying value.
- Pass a structured provenance object into reusable display components.
- Render a source label and a link only when a verified link exists.
- Use explicit withheld states for missing support.
- Add tests that prove unsupported values are not rendered.

## Completion criteria

A remediation batch is complete only when:

- The relevant display is classified as covered, exempt, or withheld.
- The classification is tested.
- The underlying source or model provenance is traceable from the rendered surface.
- The updated audit reports the coverage change without suppressing remaining gaps.

## Governance

Review provenance coverage by release rather than treating the raw percentage as a vanity metric. The goal is decision integrity on high-impact surfaces first, not rapid cosmetic coverage.
