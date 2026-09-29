# Release Readiness

## Purpose

This checklist defines the minimum evidence required before a Lacuna change is treated as production-ready. A Vercel preview proves that a preview deployment was created; it does not prove that the repository build, CI suite, end-to-end checks, data controls, or release smoke tests passed.

## Required automated checks

A production release requires all of the following checks to finish successfully on the exact commit being released:

- Build
- CI
- End-to-end tests
- Evidence gate
- CodeQL

A skipped, cancelled, stale, or failed required check is a release blocker. Do not treat a successful preview deployment as a substitute for a green check.

## Branch and artifact controls

- Update the release branch from `main` before the final validation run.
- Re-run every required check after the update.
- Regenerate and commit derived artifacts only through their supported compute workflow; do not edit dataset or lineage hashes by hand.
- Confirm that generated artifacts match the materialized dataset and the computation lineage expected by the repository checks.
- Do not merge when a pull request is marked behind its base branch.

## Data-integrity controls

- Economic values must trace to their active evidence-ledger records.
- Do not replace missing funding, valuation, dates, or other inputs with zero, placeholders, acquisition dates, or inferred values.
- Show an economic figure only when the display has the field-specific evidence path required by the applicable product surface.
- A citation label may be shown without a URL when no verified URL exists; do not invent one.
- Treat current-catalog evidence and historical replay evidence as separate states.

## Manual release smoke test

Before production promotion, verify the deployed candidate in a browser:

1. Open `/deals` and confirm cited economic figures show their supporting citation while uncited figures are withheld.
2. Open `/research` and confirm portfolio, therapeutic-area, and comparison surfaces do not show a funding amount without the dedicated funding citation.
3. Confirm that historical replay or as-of copy states its evidence limitation and does not imply a date was inferred.
4. Confirm that loading, error, and empty states remain legible on desktop and mobile widths.
5. Confirm no console errors or failed network requests occur during the tested flows.

## Promotion decision

Promote only when every required automated check is green, the branch is current with `main`, manual smoke tests pass, and the release owner records the commit SHA and validation time in the release record.

## Rollback

If production behavior diverges from the validated candidate:

1. Stop further promotion.
2. Roll back to the last known-good deployment or commit.
3. Record the affected commit, user-visible impact, detection time, and rollback time.
4. Open a corrective pull request with a reproducing test before attempting a new promotion.
