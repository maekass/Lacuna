import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scoreWithGuard } from "@/lib/payerOps/codingJudgment/guardedScore";
import { loadRecordedRun } from "@/lib/payerOps/codingJudgment/recordedRun";
import { ROUTING_GUARD_VERSION } from "@/lib/payerOps/codingJudgment/routingGuard";

const RUNS = "data/coding-judgment/runs";
const V1_RUN = `${RUNS}/2026-11-20-openrouter-free`;

function rescore(runDir: string) {
  const run = loadRecordedRun(runDir);
  return run.manifest.modelIds.flatMap((modelId) =>
    run.manifest.conditions.map((condition) =>
      scoreWithGuard({
        cases: run.cases,
        intakeFor: run.intakeFor,
        replies: run.replies,
        modelId,
        condition,
        subset: run.subset,
        benchmark: run.benchmark,
        pinnedIds: run.pinnedIds,
      })
    )
  );
}

const guardedRuns = readdirSync(RUNS)
  .map((name) => path.join(RUNS, name))
  .filter((dir) => existsSync(path.join(dir, "guarded-results.json")));

describe("guarded re-score of recorded runs (regression)", () => {
  it("covers the iteration-1 run", () => {
    expect(guardedRuns).toContain(V1_RUN);
  });

  for (const runDir of guardedRuns) {
    it(`${path.basename(runDir)}: committed guarded results reproduce offline`, () => {
      const committed = JSON.parse(
        readFileSync(path.join(runDir, "guarded-results.json"), "utf8"),
      ) as { guardVersion: string; reports: unknown };
      expect(committed.guardVersion).toBe(ROUTING_GUARD_VERSION);
      expect(JSON.parse(JSON.stringify(rescore(runDir)))).toEqual(
        committed.reports,
      );
    });

    it(`${path.basename(runDir)}: guard never adds an auto route`, () => {
      for (const report of rescore(runDir)) {
        for (const c of report.cases) {
          if (c.routeAfter === "auto") expect(c.routeBefore).toBe("auto");
        }
        expect(report.after.decidedAutomatically).toBeLessThanOrEqual(
          report.before.decidedAutomatically,
        );
      }
    });
  }

  it("v1: removes every unsafe auto route and wrong auto answer", () => {
    const reports = rescore(V1_RUN);
    const grounded = reports.filter((r) => r.condition === "grounded");
    expect(grounded.map((r) => r.before.unsafeAutoRoutes)).toEqual([2, 2]);
    for (const r of reports) {
      expect(r.after.unsafeAutoRoutes).toBe(0);
      expect(r.after.wrongAnswersAuto).toBe(0);
    }
    for (const r of reports.filter((x) => x.condition === "closed_book")) {
      expect(r.after.decidedAutomatically).toBe(0);
    }
  });
});

describe("held-out run (v2) with the guard", () => {
  const HELDOUT_RUN = `${RUNS}/2026-11-23-heldout-openrouter-free`;

  it("meets the ship bar: 0 unsafe auto routes after the guard", () => {
    const reports = rescore(HELDOUT_RUN);
    expect(reports).toHaveLength(2);
    for (const r of reports) {
      expect(r.condition).toBe("grounded");
      expect(r.after.unsafeAutoRoutes).toBe(0);
      expect(r.after.wrongAnswersAuto).toBe(0);
    }
    // Recorded before-guard failures, kept so a later change cannot hide them.
    expect(reports.map((r) => r.before.unsafeAutoRoutes)).toEqual([6, 6]);
  });

  it("re-scores against the held-out inputs named in its manifest", () => {
    const run = loadRecordedRun(HELDOUT_RUN);
    expect(run.paths.evalSet).toBe(
      "data/coding-judgment/eval-cases.v2-heldout.json",
    );
    expect(run.cases).toHaveLength(37);
  });
});
