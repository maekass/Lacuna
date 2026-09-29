import { describe, expect, it } from "vitest";
import emI from "@/data/therapeutics/fixtures/ctg/NCT01620528.json";
import { applyReviewedAssetMappings } from "@/lib/therapeutics/adapters/assetTrialMapping";
import { normalizeClinicalTrialsGovStudy } from "@/lib/therapeutics/adapters/clinicalTrialsGov";

const SOURCE = "src-ctg-NCT01620528";

describe("ClinicalTrials.gov normalization", () => {
  it("preserves EM-I registry fields without inferring success", () => {
    const result = normalizeClinicalTrialsGovStudy(emI, SOURCE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trial.nctId).toBe("NCT01620528");
    expect(result.trial.id).toBe("NCT01620528");
    expect(result.trial.rawStatus).toBe("COMPLETED");
    expect(result.trial.phase).toBe("PHASE3");
    expect(result.trial.resultStatus).toBe("results_posted");
    expect(result.trial.resultStatus).not.toBe("success");
    expect(result.trial.enrollment).toEqual({ count: 872, type: "ACTUAL" });
    expect(result.trial.sponsorName).toBe("AbbVie (prior sponsor, Abbott)");
    expect(result.trial.assetIds).toEqual([]);
    expect(result.trial.arms).toHaveLength(3);
    expect(result.trial.primaryEndpoints?.length).toBeGreaterThan(0);
    expect(result.trial.lastUpdatePostDate).toBe("2018-09-18");
    expect(result.trial.studyFirstPostDate).toBe("2012-06-15");
  });

  it("does not invent arms, endpoints, or enrollment when modules are absent", () => {
    const result = normalizeClinicalTrialsGovStudy(
      {
        protocolSection: {
          identificationModule: {
            nctId: "NCT00000001",
            briefTitle: "Fixture without modules",
          },
          statusModule: { overallStatus: "RECRUITING" },
        },
      },
      "src-ctg-NCT00000001",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trial.arms).toBeNull();
    expect(result.trial.interventions).toBeNull();
    expect(result.trial.primaryEndpoints).toBeNull();
    expect(result.trial.secondaryEndpoints).toBeNull();
    expect(result.trial.enrollment).toBeNull();
    expect(result.trial.conditions).toBeNull();
    expect(result.trial.missingFields).toEqual(
      expect.arrayContaining([
        "arms",
        "interventions",
        "primaryEndpoints",
        "enrollment",
        "conditions",
      ]),
    );
  });

  it("applies an exact intervention-name mapping and rejects a partial name", () => {
    const result = normalizeClinicalTrialsGovStudy(emI, SOURCE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const applied = applyReviewedAssetMappings(result.trial, [{
      id: "map-elagolix",
      nctId: "NCT01620528",
      assetId: "asset-elagolix",
      rule: "exact_intervention_name",
      interventionNames: ["elagolix"],
      reviewedBy: "test",
      reviewedAt: "2026-09-28",
      note: "Exact intervention name.",
    }]);
    expect(applied.rejected).toEqual([]);
    expect(applied.trial.assetIds).toEqual(["asset-elagolix"]);

    const rejected = applyReviewedAssetMappings(result.trial, [{
      id: "map-partial",
      nctId: "NCT01620528",
      assetId: "asset-elagolix",
      rule: "exact_intervention_name",
      interventionNames: ["elago"],
      reviewedBy: "test",
      reviewedAt: "2026-09-28",
      note: "Partial name must not match.",
    }]);
    expect(rejected.trial.assetIds).toEqual([]);
    expect(rejected.rejected[0]?.mappingId).toBe("map-partial");
  });
});
