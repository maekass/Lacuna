import { describe, expect, it } from "vitest";
import { scoreTfidfLogistic } from "@/lib/ml/clinicalTrials/inference";
import {
  getClinicalTrialsTrainingSource,
  isCompletionProxyAvailable,
  scoreClinicalTrial,
  scoreWhTrialRelevance,
  WH_RELEVANCE_MODEL,
} from "@/lib/ml/clinicalTrials/scoreClinicalTrial";
import { trialNumericFeatures } from "@/lib/ml/clinicalTrials/types";
import type { TfidfLogisticArtifact, TrialScoreInput } from "@/lib/ml/clinicalTrials/types";

describe("clinicalTrials ML inference", () => {
  const whTrial: TrialScoreInput = {
    title: "Phase 2 Study of LP-101 for Endometriosis Pain",
    condition: "Endometriosis",
    sponsor: "Gynecology Pharma",
    interventions: ["LP-101", "placebo"],
    phase: "PHASE2",
    status: "RECRUITING",
    enrollment: 240,
    hasResults: false,
  };

  const nonWhTrial: TrialScoreInput = {
    title: "Phase 3 Metformin for Type 2 Diabetes",
    condition: "Type 2 Diabetes Mellitus",
    sponsor: "Metabolic Pharma",
    interventions: ["Metformin"],
    phase: "PHASE3",
    status: "COMPLETED",
    enrollment: 800,
    hasResults: true,
  };

  it("scores women's health trial above non-WH trial", () => {
    const wh = scoreWhTrialRelevance(whTrial);
    const other = scoreWhTrialRelevance(nonWhTrial);
    expect(wh.probability).toBeGreaterThan(other.probability);
    expect(wh.label).toBe(true);
  });

  it("artifact has aligned vocabulary and coefficients", () => {
    expect(WH_RELEVANCE_MODEL.vocabulary.length).toBeGreaterThan(0);
    expect(WH_RELEVANCE_MODEL.coefficients.length).toBe(
      WH_RELEVANCE_MODEL.vocabulary.length,
    );
  });

  it("numeric features match python feature order", () => {
    const f = trialNumericFeatures({
      phase: "PHASE2",
      enrollment: 100,
      interventions: ["a", "b"],
      hasResults: true,
      title: "",
      condition: "",
      sponsor: "",
    });
    expect(f).toEqual([2, 2, 2, 1]);
  });

  it("scoreClinicalTrial returns wh and optional completion", () => {
    const scores = scoreClinicalTrial(whTrial);
    expect(scores.whRelevance.modelId).toBe("wh-relevance-v1");
    if (isCompletionProxyAvailable()) {
      expect(scores.completionProxy?.modelId).toBe("completion-proxy-v2");
    }
  });

  it("scoreTfidfLogistic probability is bounded", () => {
    const result = scoreTfidfLogistic(
      WH_RELEVANCE_MODEL as TfidfLogisticArtifact,
      whTrial,
    );
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(1);
  });

  it("exposes training source from model card", () => {
    expect(getClinicalTrialsTrainingSource()).toMatch(
      /synthetic_seed|ctgov_live|ctgov_cached/,
    );
  });
});
