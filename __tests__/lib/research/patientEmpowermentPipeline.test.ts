import { describe, expect, it } from "vitest";
import verifiedDataset from "@/data/dataset.verified.json";
import { CURATED_EMPOWERMENT_LINKS } from "@/data/patientEmpowermentCrosswalk";
import { PATIENT_EMPOWERMENT_METRICS } from "@/data/patientEmpowermentReport";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { empowermentContextForDeal } from "@/lib/deals/empowermentContextForDeal";
import { getFeaturedDeal } from "@/lib/deals/getFeaturedDeal";
import {
  buildDeterministicEmpowermentNarrative,
} from "@/lib/research/patientEmpowermentGapLlm";
import {
  buildPatientEmpowermentSnapshot,
  empowermentSnapshotForLlm,
  exportEmpowermentCrosswalkCsv,
  scoreGapDimension,
} from "@/lib/research/patientEmpowermentPipeline";

const dataset = verifiedDataset as VerifiedDataset;

describe("patientEmpowermentPipeline", () => {
  it("scores all cited gap dimensions", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    expect(snapshot.dimensions.length).toBe(PATIENT_EMPOWERMENT_METRICS.length);
    expect(snapshot.prerequisiteMatrix.length).toBe(4);
    expect(snapshot.phaseSummary.length).toBe(5);
    expect(snapshot.summary.metricCount).toBe(PATIENT_EMPOWERMENT_METRICS.length);
  });

  it("indexes clinical trial gap as highest severity", () => {
    const trial = PATIENT_EMPOWERMENT_METRICS.find(
      (m) => m.id === "clinical-trial-offered",
    );
    expect(trial?.gapIndexPct).toBe(80);
    expect(trial?.gapSeverity).toBe("critical");
  });

  it("prefers curated tier over sector for Foundation Medicine", () => {
    const metric = PATIENT_EMPOWERMENT_METRICS.find(
      (m) => m.id === "genetic-testing-not-recommended",
    )!;
    const view = scoreGapDimension(metric, dataset);
    const foundation = view.linkedCompanies.find((c) => c.id === "c38");
    expect(foundation?.matchTier).toBe("curated");
    expect(view.curatedLinkCount).toBeGreaterThan(0);
  });

  it("resolves all curated links to valid companies", () => {
    const companyIds = new Set(dataset.companies.map((c) => c.id));
    for (const link of CURATED_EMPOWERMENT_LINKS) {
      expect(companyIds.has(link.companyId)).toBe(true);
    }
  });

  it("links verified deals when target company matches", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    expect(snapshot.summary.linkedDealCount).toBeGreaterThan(0);
    expect(snapshot.summary.curatedLinkCount).toBeGreaterThan(0);
  });

  it("exports CSV with header and metric rows", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const csv = exportEmpowermentCrosswalkCsv(snapshot);
    expect(csv).toContain("metric_id");
    expect(csv).toContain("clinical-trial-offered");
  });

  it("exports compact LLM context", () => {
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const json = empowermentSnapshotForLlm(snapshot);
    expect(json).toContain("clinical-trial-offered");
    expect(json).toContain("curatedLinks");
    const narrative = buildDeterministicEmpowermentNarrative(snapshot);
    expect(narrative.length).toBeGreaterThan(40);
  });

  it("builds deal-level empowerment context for featured deal", () => {
    const deal = getFeaturedDeal(dataset);
    expect(deal).not.toBeNull();
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const ctx = empowermentContextForDeal(deal!, snapshot);
    expect(ctx.dealId).toBeTruthy();
    expect(ctx.baselineNote).toContain("breast cancer");
  });
});

describe("GET /api/research/patient-empowerment", () => {
  it("returns snapshot with summary", async () => {
    const { GET } = await import(
      "@/app/api/research/patient-empowerment/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as {
      summary: { metricCount: number };
      llmConfigured: boolean;
    };
    expect(body.summary.metricCount).toBe(PATIENT_EMPOWERMENT_METRICS.length);
    expect(typeof body.llmConfigured).toBe("boolean");
  });
});
