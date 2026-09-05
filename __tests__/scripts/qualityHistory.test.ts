import { describe, expect, it } from "vitest";
import {
  assembleQualityHistoryRow,
  calendarDate,
  formatQualityStepSummary,
  lastLiveRow,
  type QualityHistoryRow,
  qualityRatchetFailure,
  upsertQualityHistoryRow,
} from "../../scripts/lib/qualityHistory";

function row(overrides: Partial<QualityHistoryRow> = {}): QualityHistoryRow {
  return {
    runAt: "2026-09-05T00:00:00.000Z",
    datasetHash: "abc",
    datasetVersion: "v8",
    companies: { total: 150, avgScore: 64.3, grades: { D: 59 } },
    acquisitions: { total: 59, avgScore: 83.1, grades: { A: 20 } },
    provenance: { total: 1000, covered: 16, exempt: 10, uncovered: 974 },
    disclosure: { disclosureRate: 0.85, valuationRate: 0.39 },
    sweep: { rowCount: 36, staleRows: 0, dupes: 0, schemaErrors: 0 },
    validateDatasetWarnings: 4,
    unreachableSourceUrls: 0,
    ...overrides,
  };
}

describe("quality history ledger", () => {
  it("replaces the last row when hash and calendar date match", () => {
    const first = row({
      companies: { total: 150, avgScore: 64.3, grades: {} },
    });
    const second = row({
      runAt: "2026-09-05T18:00:00.000Z",
      companies: { total: 150, avgScore: 64.4, grades: {} },
    });
    const next = upsertQualityHistoryRow([first], second);
    expect(next).toHaveLength(1);
    expect(next[0].companies.avgScore).toBe(64.4);
  });

  it("appends when the calendar date changes", () => {
    const first = row();
    const second = row({
      runAt: "2026-09-06T00:00:00.000Z",
      datasetHash: "abc",
    });
    expect(upsertQualityHistoryRow([first], second)).toHaveLength(2);
  });

  it("skips backfilled rows when selecting the live baseline", () => {
    const history = [
      row({
        backfilled: true,
        companies: { total: 1, avgScore: 70, grades: {} },
      }),
      row({
        datasetHash: "live",
        companies: { total: 150, avgScore: 64.3, grades: {} },
      }),
    ];
    expect(lastLiveRow(history)?.datasetHash).toBe("live");
  });

  it("fails the ratchet when avgScore drops more than two points", () => {
    const failure = qualityRatchetFailure(
      row({ companies: { total: 150, avgScore: 61.0, grades: {} } }),
      row({ companies: { total: 150, avgScore: 64.3, grades: {} } }),
    );
    expect(failure).toMatch(/avgScore/);
  });

  it("fails the ratchet when uncovered sites increase", () => {
    const failure = qualityRatchetFailure(
      row({
        provenance: { total: 1000, covered: 16, exempt: 10, uncovered: 980 },
      }),
      row(),
    );
    expect(failure).toMatch(/Uncovered/);
  });

  it("honors a categorized written exemption", () => {
    const failure = qualityRatchetFailure(
      row({ companies: { total: 150, avgScore: 60, grades: {} } }),
      row(),
      [{
        category: "dataset-expansion",
        reason:
          "Added aggregator-only rows that lower the mean by construction.",
        addedAt: "2026-09-05",
        fromDatasetHash: "abc",
        toDatasetHash: "abc",
      }],
    );
    expect(failure).toBeNull();
  });

  it("rejects an exemption without a reason", () => {
    expect(() =>
      qualityRatchetFailure(row(), row(), [{
        category: "dataset-expansion",
        reason: "   ",
        addedAt: "2026-09-05",
      }])
    ).toThrow(/reason/);
  });

  it("assembles a row from committed artifacts", () => {
    const assembled = assembleQualityHistoryRow({
      runAt: "2026-09-05T00:00:00.000Z",
    });
    expect(assembled.datasetHash.length).toBe(64);
    expect(assembled.companies.total).toBeGreaterThan(0);
    expect(assembled.sweep.rowCount).toBeGreaterThan(0);
    expect(calendarDate(assembled.runAt)).toBe("2026-09-05");
  });

  it("formats a step summary with covered/total deltas", () => {
    const markdown = formatQualityStepSummary(
      row(),
      row({
        companies: { total: 150, avgScore: 63.0, grades: {} },
      }),
    );
    expect(markdown).toMatch(/Quality history/);
    expect(markdown).toMatch(/Company avgScore/);
  });
});
