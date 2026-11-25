import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findNpiLikeStrings } from "@/lib/payerOps/codingJudgment/checks";
import { loadRecordedRun } from "@/lib/payerOps/codingJudgment/recordedRun";
import {
  buildReviewerDemo,
  describePinnedRow,
  REVIEWER_DEMO_PATH,
  REVIEWER_DEMO_RUNS,
} from "@/lib/payerOps/codingJudgment/reviewerDemo";
import {
  buildTestCaseCandidate,
  reviewerDemoSchema,
  testCaseCandidateSchema,
} from "@/lib/payerOps/codingJudgment/reviewerDemoView";

const fresh = buildReviewerDemo(
  REVIEWER_DEMO_RUNS.map(({ runDir, label, note }) => ({
    run: loadRecordedRun(runDir),
    label,
    note,
  })),
);
const committedText = readFileSync(REVIEWER_DEMO_PATH, "utf8");
const committed = reviewerDemoSchema.parse(JSON.parse(committedText));

describe("reviewer demo data", () => {
  it("committed file matches a fresh build from the recorded runs", () => {
    expect(committed).toEqual(fresh);
  });

  it("has one record per recorded model × arm × case", () => {
    // v1: 2 models × 2 arms × 34; held-out: 2 models × 1 arm × 37.
    expect(fresh.records).toHaveLength(2 * 2 * 34 + 2 * 37);
    expect(new Set(fresh.records.map((r) => r.key)).size).toBe(
      fresh.records.length,
    );
  });

  it("route counts agree with the guarded re-score", () => {
    // Totals across both runs: grounded v1 18+18 auto, closed v1 0+0,
    // held-out 15+15; overrides 5+5+3+8 (v1) and 9+10 (held-out).
    expect(fresh.records.filter((r) => r.finalRoute === "auto")).toHaveLength(
      66,
    );
    expect(fresh.records.filter((r) => r.overrodeModel)).toHaveLength(40);
    for (const r of fresh.records) {
      expect(r.reasons.length === 0).toBe(r.finalRoute === "auto");
      expect(r.reasonText.length).toBeGreaterThan(0);
    }
  });

  it("leaves the answer key out", () => {
    for (const key of ["expected", "acceptableRoutes", "kind", "basis"]) {
      expect(committedText).not.toContain(`"${key}"`);
    }
  });

  it("resolves every guard row and contains no NPI-like strings", () => {
    for (const r of fresh.records) {
      const run = fresh.runs.find((x) => x.runId === r.runId);
      for (const id of r.decidingRowIds) expect(run?.rows[id]).toBeDefined();
    }
    expect(findNpiLikeStrings(committedText)).toEqual([]);
  });

  it("describes pinned rows and rejects unknown ids", () => {
    const run = loadRecordedRun(REVIEWER_DEMO_RUNS[0].runDir);
    const ptp = run.subset.ptpEdits[0];
    expect(describePinnedRow(ptp.id, run.subset, run.benchmark)?.title).toBe(
      `PTP edit ${ptp.column1} / ${ptp.column2}`,
    );
    const profile = run.benchmark.profiles[0];
    expect(describePinnedRow(profile.id, run.subset, run.benchmark)?.title)
      .toBe("Provider profile (hashed id)");
    expect(describePinnedRow("ptp:made-up", run.subset, run.benchmark))
      .toBeNull();
  });
});

describe("test-case candidate", () => {
  const record = fresh.records.find((r) => r.overrodeModel && r.model.ok);
  if (!record) throw new Error("fixture: expected an override");
  const run = fresh.runs.find((r) => r.runId === record.runId);
  const item = run?.items.find((i) => i.caseId === record.caseId);
  if (!item) throw new Error("fixture: missing item");

  it("carries the source, the recorded routes and the reviewer note", () => {
    const candidate = buildTestCaseCandidate(
      record,
      item,
      fresh.guardVersion,
      {
        note: "  Wrong row cited.  ",
        proposedDecision: "flag",
        proposedRoute: null,
      },
      "2026-11-25T12:00:00.000Z",
    );
    expect(testCaseCandidateSchema.parse(candidate)).toEqual(candidate);
    expect(candidate.status).toBe("candidate_not_adjudicated");
    expect(candidate.source).toEqual({
      runId: record.runId,
      caseId: record.caseId,
      modelId: record.modelId,
      condition: record.condition,
      guardVersion: fresh.guardVersion,
    });
    expect(candidate.recorded.finalRoute).toBe("human_review");
    expect(candidate.recorded.modelRoute).toBe("auto");
    expect(candidate.reviewer.note).toBe("Wrong row cited.");
  });

  it("refuses an empty note and a mismatched case", () => {
    expect(() =>
      buildTestCaseCandidate(record, item, fresh.guardVersion, {
        note: "   ",
        proposedDecision: null,
        proposedRoute: null,
      }, "2026-11-25T12:00:00.000Z")
    ).toThrow();
    const other = run?.items.find((i) => i.caseId !== record.caseId);
    if (!other) throw new Error("fixture: need a second item");
    expect(() =>
      buildTestCaseCandidate(record, other, fresh.guardVersion, {
        note: "x",
        proposedDecision: null,
        proposedRoute: null,
      }, "2026-11-25T12:00:00.000Z")
    ).toThrow(/is not case/);
  });
});
