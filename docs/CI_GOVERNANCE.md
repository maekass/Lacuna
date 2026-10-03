# Lacuna CI Governance

## Purpose

This document defines the governance contract for Lacuna's continuous
integration system. It is intentionally separate from the public README.

The machine-readable source of truth is `.github/ci-governance.json`. CI
validates that contract on every pull request.

## Check classes

### Integrity

Integrity checks establish repository-level structural health: formatting,
linting, type consistency, and buildability.

A passing integrity check does not establish runtime correctness, data validity,
provenance, or analytical validity.

### Smoke

A smoke check establishes that a critical path is wired and executable.

A smoke check may establish that the relevant component exists, dependencies
resolve, the path executes, expected output structure is present, and a critical
failure is surfaced.

A smoke check does **not** establish factual correctness, provenance strength,
statistical validity, causal validity, model performance, source authority,
completeness, or decision eligibility.

**Rule: a passing smoke check establishes operability, not validity.**

### Full

A full check exercises the substantive behavior represented by its scope. Its
claim is limited to the claim declared in the machine-readable contract.

### Release

Release checks apply to release or publication contexts rather than universally
to every PR. A release check cannot be used to imply analytical validity unless
a separate full check establishes that claim.

## Failure policy

Each check declares one of:

- `fail-closed`: failure blocks the governed path and should not be bypassed by
  absence of evidence;
- `fail`: failure blocks the governed path;
- `warn`: failure is surfaced but does not block the path;
- `informational`: observation only.

Required checks must use `fail` or `fail-closed`.

## Universal PR governance

Every PR receives the `CI Governance / contract` job. This lightweight gate
validates:

1. the machine-readable contract is structurally valid;
2. check IDs are unique;
3. classes and failure policies are declared;
4. required checks have explicit limitations;
5. npm commands referenced by the contract exist;
6. universal PR checks are represented in the main CI workflow;
7. the main CI workflow itself runs the governance gate;
8. required checks are not silently downgraded.

This is governance-of-CI, not a replacement for CI.

## Evidence boundary

A successful lower-assurance check cannot substitute for a higher-assurance
check.

A smoke check that a provenance pipeline runs does not replace a full provenance
check. A build that succeeds does not prove data correctness. A passing model
execution does not prove model validity. A citation being present does not by
itself establish the truth of the cited claim.

## CI provenance

The governance job emits its contract version and check-class census into the
GitHub Actions step summary. Future release artifacts may attach commit SHA,
workflow run, dataset/artifact hashes, and governance result to extend
provenance from data artifacts to CI execution itself.

## Scope

The contract lives in code so changes to the governance standard are reviewable,
testable, and versioned. Governance changes should therefore be made through
pull requests rather than undocumented workflow edits.

The README does not need to reproduce this operational policy.
