import { describe, expect, it } from "vitest";
import { endometriosisTherapeuticsGraph } from "@/data/therapeutics/endometriosis";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { projectTherapeuticClaims } from "@/lib/therapeutics/claims";
import { getTherapeuticStateAt } from "@/lib/therapeutics/pointInTime";
import { validateTherapeuticsGraph } from "@/lib/therapeutics/validateGraph";

function bucket(
  subjectId: string,
  date: string,
  claimId: string,
): "admissible" | "excludedFuture" | "unresolved" | "absent" {
  const state = getTherapeuticStateAt(
    endometriosisTherapeuticsGraph,
    subjectId,
    date,
  );
  if (state.admissible.some((claim) => claim.claimId === claimId)) {
    return "admissible";
  }
  if (state.excludedFuture.some((claim) => claim.claimId === claimId)) {
    return "excludedFuture";
  }
  if (state.unresolved.some((item) => item.claimId === claimId)) {
    return "unresolved";
  }
  return "absent";
}

describe("endometriosis therapeutics graph", () => {
  it("passes integrity checks and leaves the verified deal set unchanged", () => {
    const report = validateTherapeuticsGraph(endometriosisTherapeuticsGraph);
    expect(report.errors).toEqual([]);
    expect(report.stats.assets).toBe(6);
    expect(report.stats.trials).toBe(8);
    expect(report.stats.regulatoryEvents).toBe(5);
    expect(getStaticVerifiedDataset().acquisitions).toHaveLength(59);
  });

  it("links reviewed assets to normalized trials", () => {
    const byAsset = (assetId: string) =>
      endometriosisTherapeuticsGraph.trials.filter((trial) =>
        trial.assetIds.includes(assetId)
      ).map((trial) => trial.nctId);

    expect(byAsset("asset-elagolix")).toEqual([
      "NCT01620528",
      "NCT01931670",
    ]);
    expect(byAsset("asset-relugolix-combination")).toEqual([
      "NCT03204318",
      "NCT03204331",
    ]);
    expect(byAsset("asset-linzagolix")).toEqual(["NCT03992846"]);
    expect(byAsset("asset-hmi-115")).toEqual(["NCT05101317"]);
    expect(byAsset("asset-dichloroacetate")).toEqual(["NCT04046081"]);
    expect(byAsset("asset-vipoglanstat")).toEqual(["NCT07260669"]);
    expect(
      endometriosisTherapeuticsGraph.trials.every((trial) =>
        trial.resultStatus === "results_posted" ||
        trial.resultStatus === "results_not_posted"
      ),
    ).toBe(true);
  });

  it("excludes later publications from earlier snapshots", () => {
    expect(bucket(
      "asset-elagolix",
      "2017-08-23",
      "claim-elagolix-filing-date",
    )).toBe("excludedFuture");
    expect(bucket(
      "asset-elagolix",
      "2018-07-23",
      "claim-elagolix-decision-date",
    )).toBe("admissible");
    expect(bucket(
      "asset-elagolix",
      "2018-07-23",
      "NCT01620528:registry.overallStatus",
    )).toBe("excludedFuture");
    expect(bucket(
      "asset-elagolix",
      "2018-09-17",
      "out-nct01620528-dys-150:treatmentValue",
    )).toBe("excludedFuture");
    expect(bucket(
      "asset-elagolix",
      "2018-09-18",
      "out-nct01620528-dys-150:treatmentValue",
    )).toBe("admissible");
    expect(bucket(
      "asset-relugolix-combination",
      "2022-08-05",
      "claim-myfembree-press-decision",
    )).toBe("admissible");
    expect(bucket(
      "asset-relugolix-combination",
      "2022-08-05",
      "claim-myfembree-letter-outcome",
    )).toBe("excludedFuture");
    expect(bucket(
      "asset-relugolix-combination",
      "2022-08-08",
      "claim-myfembree-letter-outcome",
    )).toBe("admissible");
    expect(bucket(
      "asset-linzagolix",
      "2024-11-22",
      "claim-cat-linzagolix-date",
    )).toBe("excludedFuture");
    expect(bucket(
      "asset-elagolix",
      "2026-09-28",
      "claim-elagolix-modality",
    )).toBe("unresolved");
    expect(bucket(
      "disease-endometriosis",
      "2026-09-28",
      "claim-icd10-n80",
    )).toBe("unresolved");
  });

  it("leaves contradictory observations unresolved", () => {
    expect(
      endometriosisTherapeuticsGraph.conflicts.map((conflict) =>
        conflict.resolutionStatus
      ),
    ).toEqual([
      "unresolved",
      "unresolved",
      "unresolved",
      "unresolved",
    ]);
    const timing = endometriosisTherapeuticsGraph.conflicts.find((conflict) =>
      conflict.id === "conflict-linzagolix-endo-timing"
    );
    expect(timing?.competingObservations.map((item) => item.value)).toEqual([
      "December 2024",
      "2024-11-22",
    ]);
    expect(timing?.precedenceRule).toBeUndefined();
  });

  it("flags duplicate ids, dangling asset links, and assumptions projected as evidence", () => {
    const duplicate = structuredClone(endometriosisTherapeuticsGraph);
    duplicate.assets.push(duplicate.assets[0]!);
    expect(
      validateTherapeuticsGraph(duplicate).errors.some((issue) =>
        issue.code === "duplicate_id"
      ),
    ).toBe(true);

    const dangling = structuredClone(endometriosisTherapeuticsGraph);
    dangling.trials[0]!.assetIds = ["asset-missing"];
    const danglingCodes = validateTherapeuticsGraph(dangling).errors.map((
      issue,
    ) => issue.code);
    expect(danglingCodes).toContain("dangling_asset");
    expect(danglingCodes).toContain("unreviewed_asset_link");

    const leaked = structuredClone(endometriosisTherapeuticsGraph);
    leaked.theses[0]!.assumptions[0]!.id = "claim-elagolix-decision-date";
    expect(
      projectTherapeuticClaims(leaked).some((claim) =>
        claim.claimId === "claim-elagolix-decision-date"
      ),
    ).toBe(true);
    expect(
      validateTherapeuticsGraph(leaked).errors.some((issue) =>
        issue.code === "assumption_in_evidence"
      ),
    ).toBe(true);
  });
});
