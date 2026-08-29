import { describe, expect, it } from "vitest";
import verifiedDataset from "@/data/dataset.verified.json";
import {
  CURATED_EMPOWERMENT_LINKS,
  curatedCompanyIds,
} from "@/data/patientEmpowermentCrosswalk";
import { PATIENT_EMPOWERMENT_METRICS } from "@/data/patientEmpowermentReport";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { empowermentContextForDeal } from "@/lib/deals/empowermentContextForDeal";
import { getDealById } from "@/lib/deals/getDealById";
import { getFeaturedDeal } from "@/lib/deals/getFeaturedDeal";
import {
  buildDeterministicEmpowermentNarrative,
} from "@/lib/research/patientEmpowermentGapLlm";
import {
  computeGapPriorityScore,
  computeWeightedBurdenIndex,
} from "@/lib/research/patientEmpowermentScoring";
import {
  buildPatientEmpowermentSnapshot,
  empowermentSnapshotForLlm,
  exportEmpowermentCrosswalkCsv,
  listEmpowermentComparableCompanyIds,
  scoreGapDimension,
  toPatientEmpowermentInsightData,
} from "@/lib/research/patientEmpowermentPipeline";

const dataset = verifiedDataset as VerifiedDataset;

describe("patientEmpowermentPipeline", () => {
  it("scores all cited gap dimensions", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    expect(snapshot.dimensions.length).toBe(PATIENT_EMPOWERMENT_METRICS.length);
    expect(snapshot.priorityRankings.length).toBe(
      PATIENT_EMPOWERMENT_METRICS.length,
    );
    expect(snapshot.summary.metricCount).toBe(
      PATIENT_EMPOWERMENT_METRICS.length,
    );
  });

  it("exposes composite summary indices", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const { summary } = snapshot;
    expect(summary.medianGapIndexPct).toBeGreaterThan(0);
    expect(summary.weightedBurdenIndexPct).toBeGreaterThanOrEqual(
      summary.meanGapIndexPct,
    );
    expect(summary.criticalMetricCount).toBeGreaterThanOrEqual(1);
    expect(summary.maxGapMetricLabel.length).toBeGreaterThan(5);
    expect(summary.meanHighSeverityGapIndexPct).toBeGreaterThan(
      summary.meanGapIndexPct,
    );
  });

  it("projects a slim insight payload from the snapshot", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const insight = toPatientEmpowermentInsightData(snapshot);
    expect(insight.surveyRespondents).toBe(snapshot.headline.surveyRespondents);
    expect(insight.maxGapIndexPct).toBe(snapshot.summary.maxGapIndexPct);
    expect(insight.maxGapMetricLabel).toBe(snapshot.summary.maxGapMetricLabel);
    expect(insight.highestGapPrerequisiteId).toBe(
      snapshot.summary.highestGapPrerequisiteId,
    );
    expect(insight.topPriorityLabel).toBe(
      snapshot.priorityRankings[0]?.metric.label,
    );
  });

  it("computes priority score as gap × thin coverage", () => {
    expect(computeGapPriorityScore(80, 20)).toBe(64);
    expect(computeGapPriorityScore(80, 100)).toBe(0);
  });

  it("splits curated, heuristic, and evidence coverage in sector", () => {
    const metric = PATIENT_EMPOWERMENT_METRICS.find(
      (m) => m.id === "genetic-testing-not-recommended",
    )!;
    const view = scoreGapDimension(metric, dataset);
    const foundation = view.linkedCompanies.find((c) => c.id === "c38");
    expect(foundation?.matchTier).toBe("curated");
    expect(foundation?.sourceUrl).toBeTruthy();
    expect(foundation?.sourceTier).toBe("website");
    expect(view.curatedCoveragePct).toBeGreaterThan(0);
    expect(view.heuristicCoveragePct).toBeGreaterThan(0);
    expect(view.evidenceCoveragePct).toBeGreaterThan(0);
    expect(view.evidenceCoveragePct).toBeLessThanOrEqual(
      view.curatedCoveragePct,
    );
    expect(view.curatedCoveragePct + view.heuristicCoveragePct)
      .toBeLessThanOrEqual(100);
    expect(view.portfolioCoveragePct).toBe(100);
    expect(view.priorityScore).toBeGreaterThan(0);
  });

  it("tracks evidence-backed link counts in summary", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    expect(snapshot.summary.evidenceBackedLinkCount).toBeGreaterThan(0);
    expect(snapshot.summary.evidenceBackedLinkCount).toBeLessThanOrEqual(
      snapshot.summary.curatedLinkCount,
    );
    expect(snapshot.summary.meanEvidenceCoveragePct).toBeGreaterThan(0);
  });

  it("ranks thin-curated high-gap dimensions highly", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const unaware = snapshot.priorityRankings.find(
      (d) => d.metric.id === "unaware-survivorship-resources",
    );
    expect(unaware?.curatedCoveragePct).toBeLessThanOrEqual(50);
    expect(unaware?.evidenceCoveragePct).toBeLessThanOrEqual(
      unaware?.curatedCoveragePct ?? 0,
    );
    expect(unaware?.priorityScore).toBeGreaterThanOrEqual(30);
  });

  it("sorts priority rankings by priority score", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const scores = snapshot.priorityRankings.map((d) => d.priorityScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]!).toBeGreaterThanOrEqual(scores[i]!);
    }
  });

  it("exports CSV with summary section", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const csv = exportEmpowermentCrosswalkCsv(snapshot);
    expect(csv).toContain("summary,median_gap_index");
    expect(csv).toContain("source_url");
    expect(csv).toContain("evidence_coverage_pct");
  });

  it("exports LLM context with high priority gaps first", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const json = empowermentSnapshotForLlm(snapshot);
    expect(json).toContain("highPriorityGaps");
    expect(json).toContain("weightedBurdenIndexPct");
    const narrative = buildDeterministicEmpowermentNarrative(snapshot);
    expect(narrative).toContain("median gap");
    expect(narrative).toContain("weighted burden");
  });

  it("lists empowerment comparables by curated tag overlap", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const ids = listEmpowermentComparableCompanyIds(snapshot, "c38");
    expect(Array.isArray(ids)).toBe(true);
  });

  it("builds deal context from curated mappings only", () => {
    const deal = getFeaturedDeal(dataset);
    expect(deal).not.toBeNull();
    const ctx = empowermentContextForDeal(deal!, dataset);
    expect(ctx.scopeAlignment).toBe("high");
    expect(ctx.hasDirectMatch).toBe(true);
    expect(ctx.matchedDimensions.length).toBeGreaterThan(0);
    expect(
      ctx.matchedDimensions.every((m) => m.targetMatchTier === "curated"),
    ).toBe(true);
    expect(ctx.matchedDimensions.every((m) => m.citedValue.length > 0)).toBe(
      true,
    );
    expect(ctx.conditionScopeLabel).toContain("Breast cancer");
  });

  it("hides keyword/sector affinity on deals without curated links", () => {
    const deal = getDealById(dataset, "deal9");
    expect(deal?.acquisition.targetName).toBe("Gynesonics");
    const ctx = empowermentContextForDeal(deal!, dataset);
    expect(ctx.hasDirectMatch).toBe(false);
    expect(ctx.matchedDimensions).toEqual([]);
    expect(ctx.scopeAlignment).toBe("none");
  });

  it("validates curated links have reviewedAt", () => {
    for (const link of CURATED_EMPOWERMENT_LINKS) {
      expect(link.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(curatedCompanyIds().size).toBeGreaterThan(10);
  });

  it("weighted burden exceeds simple mean for current catalog", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const manual = computeWeightedBurdenIndex(
      snapshot.dimensions.map((d) => ({
        gapIndexPct: d.metric.gapIndexPct,
        phase: d.metric.phase,
        prerequisiteId: d.metric.prerequisiteId,
        gapSeverity: d.metric.gapSeverity,
      })),
    );
    expect(snapshot.summary.weightedBurdenIndexPct).toBe(manual);
  });
});

describe("GET /api/research/patient-empowerment", () => {
  it("returns snapshot with extended summary", async () => {
    const { GET } = await import(
      "@/app/api/research/patient-empowerment/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as {
      summary: { medianGapIndexPct: number; weightedBurdenIndexPct: number };
      gapDistribution: { critical: number };
      priorityRankings: unknown[];
    };
    expect(body.summary.medianGapIndexPct).toBeGreaterThan(0);
    expect(body.summary.weightedBurdenIndexPct).toBeGreaterThan(0);
    expect(body.gapDistribution.critical).toBeGreaterThanOrEqual(1);
    expect(body.priorityRankings.length).toBe(
      PATIENT_EMPOWERMENT_METRICS.length,
    );
  });
});
