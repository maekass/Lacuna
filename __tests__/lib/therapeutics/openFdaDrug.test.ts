import { describe, expect, it } from "vitest";
import application from "../../fixtures/therapeutics/openfda-nda210450.json";
import { endometriosisTherapeuticsGraph } from "@/data/therapeutics/endometriosis";
import { normalizeOpenFdaDrugApplication } from "@/lib/therapeutics/adapters/openFdaDrug";
import { getTherapeuticStateAt } from "@/lib/therapeutics/pointInTime";

describe("openFDA drug normalization", () => {
  it("maps reviewed application submissions without inferring an indication", () => {
    const result = normalizeOpenFdaDrugApplication({
      record: application,
      sourceId: "src-openfda-nda210450-test",
      retrievedAt: "2026-09-28",
      assetId: "asset-elagolix",
      reviewedApplicationNumber: "NDA210450",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(2);
    const approval = result.events[0];
    expect(approval?.eventType.value).toBe("approval");
    expect(approval?.decisionDate?.value).toBe("2018-07-23");
    expect(approval?.decisionDate?.eventDate).toBe("2018-07-23");
    expect(approval?.decisionDate?.asOf).toBe("2026-09-28");
    expect(approval?.indicationText).toBeUndefined();
    expect(result.events[1]?.eventType.value).toBe("label_change");
  });

  it("does not match an asset from a brand name", () => {
    const result = normalizeOpenFdaDrugApplication({
      record: application,
      sourceId: "src-openfda-nda210450-test",
      retrievedAt: "2026-09-28",
      assetId: "asset-elagolix",
      reviewedApplicationNumber: "ORILISSA",
    });
    expect(result.ok).toBe(false);
  });

  it("keeps an undated API snapshot out of an earlier historical view", () => {
    const result = normalizeOpenFdaDrugApplication({
      record: application,
      sourceId: "src-openfda-nda210450-test",
      retrievedAt: "2026-09-28",
      assetId: "asset-elagolix",
      reviewedApplicationNumber: "NDA210450",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const graph = structuredClone(endometriosisTherapeuticsGraph);
    graph.sources.push({
      id: "src-openfda-nda210450-test",
      title: "openFDA NDA210450 test snapshot",
      publisher: "U.S. Food and Drug Administration",
      url:
        "https://api.fda.gov/drug/drugsfda.json?search=application_number:NDA210450&limit=1",
      locator: "submissions",
      retrievedAt: "2026-09-28",
      sourceClass: "regulatory",
    });
    graph.regulatoryEvents.push(...result.events);

    const state = getTherapeuticStateAt(graph, "asset-elagolix", "2018-07-23");
    const openFdaClaims = [
      ...state.admissible,
      ...state.excludedFuture,
    ].filter((claim) => claim.claimId.startsWith("openfda-NDA210450"));
    expect(openFdaClaims).toEqual([]);
    expect(
      state.unresolved.some((item) =>
        item.claimId === "openfda-NDA210450-ORIG-1-AP:decisionDate"
      ),
    ).toBe(true);
    expect(
      state.admissible.some((claim) =>
        claim.claimId === "claim-elagolix-decision-date"
      ),
    ).toBe(true);
  });
});
