import { describe, expect, it } from "vitest";
import { scoreTfidfLogistic } from "@/lib/ml/clinicalTrials/inference";
import {
  getClinicalTrialsTrainingSource,
  scoreWhTrialRelevance,
  WH_RELEVANCE_MODEL,
} from "@/lib/ml/clinicalTrials/scoreClinicalTrial";
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
  };

  const nonWhTrial: TrialScoreInput = {
    title: "Phase 3 Metformin for Type 2 Diabetes",
    condition: "Type 2 Diabetes Mellitus",
    sponsor: "Metabolic Pharma",
    interventions: ["Metformin"],
    phase: "PHASE3",
    status: "COMPLETED",
    enrollment: 800,
  };

  it("scores women's health trial above non-WH trial", () => {
    const wh = scoreWhTrialRelevance(whTrial);
    const other = scoreWhTrialRelevance(nonWhTrial);
    expect(wh.probability).toBeGreaterThan(other.probability);
    expect(wh.label).toBe(true);
  });

  it("artifact has vocabulary and coefficients aligned", () => {
    expect(WH_RELEVANCE_MODEL.vocabulary.length).toBeGreaterThan(0);
    expect(WH_RELEVANCE_MODEL.coefficients.length).toBe(
      WH_RELEVANCE_MODEL.vocabulary.length,
    );
    expect(WH_RELEVANCE_MODEL.idf.length).toBe(
      WH_RELEVANCE_MODEL.vocabulary.length,
    );
  });

  it("scoreTfidfLogistic returns probability in [0, 1]", () => {
    const result = scoreTfidfLogistic(
      WH_RELEVANCE_MODEL as TfidfLogisticArtifact,
      whTrial,
    );
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(1);
    expect(result.modelId).toBe("wh-relevance-v1");
  });

  it("exposes training source from model card", () => {
    expect(getClinicalTrialsTrainingSource()).toMatch(/synthetic_seed|ctgov_live/);
  });
});
