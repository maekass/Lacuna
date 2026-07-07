import { describe, expect, it } from "vitest";
import verifiedDataset from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { buildDeterministicGapNarrative } from "@/lib/research/spaceWhGapLlm";
import {
  buildTrialToTransactionSnapshot,
  pipelineSnapshotForLlm,
  scoreAssetPipeline,
} from "@/lib/research/trialToTransactionPipeline";
import { SPACE_WH_RESEARCH_ASSETS } from "@/data/spaceWhResearchAssets";

const dataset = verifiedDataset as VerifiedDataset;

describe("trialToTransactionPipeline", () => {
  it("scores all curated assets", () => {
    const snapshot = buildTrialToTransactionSnapshot(dataset);
    expect(snapshot.assets.length).toBe(SPACE_WH_RESEARCH_ASSETS.length);
    expect(snapshot.summary.assetCount).toBe(SPACE_WH_RESEARCH_ASSETS.length);
    expect(snapshot.areaMatrix.length).toBeGreaterThan(0);
  });

  it("marks physiology-only assets without space_validation", () => {
    const astro = SPACE_WH_RESEARCH_ASSETS.find((a) =>
      a.id === "astrocup-menstrual-cups"
    );
    expect(astro).toBeDefined();
    const view = scoreAssetPipeline(astro!, dataset);
    expect(view.stagesReached).toContain("research_signal");
    expect(view.stagesReached).not.toContain("space_validation");
    expect(view.isCommercialGap).toBe(true);
  });

  it("gives BP-NELL-PEG space_validation but commercial gap", () => {
    const nell = SPACE_WH_RESEARCH_ASSETS.find((a) => a.id === "bp-nell-peg");
    const view = scoreAssetPipeline(nell!, dataset);
    expect(view.furthestStage).toBe("earth_trial");
    expect(view.isCommercialGap).toBe(true);
    expect(view.missingStages).toContain("company");
    expect(view.missingStages).toContain("transaction");
  });

  it("links Organon alias for operational contraceptives", () => {
    const coc = SPACE_WH_RESEARCH_ASSETS.find(
      (a) => a.id === "astronaut-coc-menstrual-suppression",
    );
    const view = scoreAssetPipeline(coc!, dataset);
    expect(view.linkedCompanies.length + view.linkedAcquisitions.length)
      .toBeGreaterThan(0);
  });

  it("exports compact LLM context", () => {
    const snapshot = buildTrialToTransactionSnapshot(dataset);
    const json = pipelineSnapshotForLlm(snapshot);
    expect(json).toContain("bp-nell-peg");
    expect(json).toContain("commercialGap");
    const narrative = buildDeterministicGapNarrative(snapshot);
    expect(narrative.length).toBeGreaterThan(40);
  });
});
