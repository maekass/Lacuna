# Dataset changelog

Human-readable notes when verified acquisitions are promoted from staging.

## Current snapshot baseline

Compared against `src/data/computed-dataset-summary.json`:

| Field           | Baseline value |
| --------------- | -------------- |
| Verified deals  | 59             |
| Last updated    | 2026-07-02     |
| Dataset version | v7             |

Live count comes from `dataset.verified.json` → `provenance.lastUpdated`.

## Hub strip

`getDatasetChangelog()` in `src/lib/data/getDatasetChangelog.ts` diffs current
JSON vs computed snapshot. Hub and Methods use `DatasetCoverageFootnote` to show
**N verified · M staging candidates** (M from `GET /api/deals/pending/metrics`).
When deals are added and `npm run compute:all` has not yet refreshed the
snapshot, hub shows **"+N verified deals since …"**.

## After promoting new deals

1. Run `npm run compute:all` to refresh headline stats and snapshot.
2. Update this file with date, deal IDs, and primary sources.
3. Optional PR template snippet:

```markdown
## Dataset

- [ ] `npm run validate:dataset` passes
- [ ] `docs/CHANGELOG_DATASET.md` updated if acquisitions changed
- [ ] Promotion checklist completed for each new deal (dual-source gates)
```

## Candidate vs verified

| Layer    | Location                | Visible in charts?                   |
| -------- | ----------------------- | ------------------------------------ |
| Verified | `dataset.verified.json` | Yes                                  |
| Staging  | Postgres `lacuna_deals` | No — review queue on `/deals#review` |
