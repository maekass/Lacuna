# Data Coverage Status

## Scope

This document describes the current limits of Lacuna's economic-evidence and historical-replay coverage. It is a transparency document, not a target-setting document: missing provenance must remain missing until a source supports a backfill.

## Current economic replay coverage

The latest quality-visibility report for the current reviewed change set records:

| Measure | Count |
| --- | ---: |
| Active economic evidence records | 98 |
| Historical replay-eligible records | 44 |
| Historical replay eligibility | 44.9% |
| Current-catalog-only records missing `publicAsOfDate` | 31 |
| Funding records eligible for historical replay | 0 of 40 |
| Funding records missing `publicAsOfDate` | 22 of 40 |
| Last-known valuation records eligible for historical replay | 44 of 58 |
| Last-known valuation records missing `publicAsOfDate` | 9 of 58 |

A record is eligible for day-level historical replay only when its active evidence contains a real, day-precision `publicAsOfDate`, a non-empty citation, and internally consistent dates.

## Interpretation

- **Current catalog** means Lacuna may use the active evidence record to describe the present verified catalog, subject to the product surface's display-provenance rules.
- **Historical replay** means the record can be included in an as-of analysis only when the evidence establishes that the fact was publicly knowable on or before the requested date.
- **Missing `publicAsOfDate`** means current-catalog-only. It is not a zero, a negative result, or authorization to infer a date.

## Non-negotiable rules

Do not use any of the following as a substitute for `publicAsOfDate`:

- Acquisition announcement date
- Acquisition close date
- Filing year
- Record-ingestion date
- A period-start placeholder
- A date inferred from a related source

Backfill a public-as-of date only when the underlying source demonstrates when the economic fact was publicly knowable.

## Known limitations

- Historical replay coverage is uneven: the current reviewed report shows no replay-eligible total-funding records.
- A separate pre-merge report and the later generated visibility report contain differing replay summaries. Treat the generated quality-visibility artifact on the exact release commit as authoritative, and reconcile differences before making release-facing claims.
- Dedicated as-of coverage for primary economic figures and replay eligibility answer different questions. Do not substitute one measure for the other.

## Product language

Use bounded copy such as: "Historical replay is available only for records with documented public-as-of evidence. Records without that evidence remain current-catalog-only."

Do not claim that funding or valuation history is complete, point-in-time complete, or representative of every catalog company until the relevant coverage supports that statement.
