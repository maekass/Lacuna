import { describe, expect, it } from "vitest";
import { buildCatalystWatchlistView } from "@/lib/intel/catalystWatchlistView";
import { trialLinksForCatalyst } from "@/lib/intel/catalystTrialLinks";
import {
  isKeyedRegulatoryCitation,
  KEYED_REGULATORY_CITATIONS,
} from "@/lib/deals";
import { DOMESTIC_TRIAL_PRESETS } from "@/lib/research/institutionPresets";

describe("weekly catalyst trial links", () => {
  it("joins GRAIL Galleri to PATHFINDER studies and the Illumina deal", () => {
    const match = trialLinksForCatalyst("GRAIL", "Galleri MCED test");
    expect(match?.dealHref).toBe("/deals/deal29");
    expect(match?.ncts.map((row) => row.nctId)).toEqual([
      "NCT04241796",
      "NCT05155605",
    ]);
    expect(match?.ncts.every((row) => row.surface === "deal_keyed")).toBe(
      true,
    );
  });

  it("joins relacorilant to ROSELLA without inventing a verified company", () => {
    const match = trialLinksForCatalyst(
      "Corcept Therapeutics",
      "relacorilant (Lifyorli)",
    );
    expect(match?.dealHref).toBeUndefined();
    expect(match?.ncts).toEqual([
      expect.objectContaining({
        nctId: "NCT05257408",
        surface: "research_only",
        nihSponsor: false,
      }),
    ]);
  });

  it("does not attach the NCI MATCH trial to the Pebrilzo biosimilar row", () => {
    expect(
      trialLinksForCatalyst(
        "Biosimilar Collaborations Ireland",
        "pertuzumab biosimilar (Pebrilzo)",
      ),
    ).toBeUndefined();
  });

  it("keeps GRAIL keyed citations in lockstep with the weekly PATHFINDER links", () => {
    const keyed = KEYED_REGULATORY_CITATIONS.filter((row) =>
      row.targetId === "c46"
    );
    expect(keyed.every((row) => isKeyedRegulatoryCitation(row))).toBe(true);
    expect(keyed.map((row) => row.code)).toEqual([
      "NCT04241796",
      "NCT05155605",
    ]);
  });

  it("adds GRAIL, NCI HER2, and platinum-resistant ovarian trial presets", () => {
    const ids = DOMESTIC_TRIAL_PRESETS.map((row) => row.id);
    expect(ids).toContain("grail-mced");
    expect(ids).toContain("nci-her2-pertuzumab");
    expect(ids).toContain("platinum-resistant-ovarian");
    const nci = DOMESTIC_TRIAL_PRESETS.find((row) =>
      row.id === "nci-her2-pertuzumab"
    );
    expect(nci?.sponsor).toBe("National Cancer Institute");
  });

  it("surfaces GRAIL trial links on the intelligence watchlist view", () => {
    const view = buildCatalystWatchlistView("2026-09-20");
    const grail = view.trackedRows.find((row) => row.company === "GRAIL");
    expect(grail?.dealHref).toBe("/deals/deal29");
    expect(grail?.trialLinks.map((row) => row.nctId)).toEqual([
      "NCT04241796",
      "NCT05155605",
    ]);
    const relacorilant = view.womensHealthRows.find((row) =>
      row.drug.includes("relacorilant")
    );
    expect(relacorilant?.trialLinks.map((row) => row.nctId)).toEqual([
      "NCT05257408",
    ]);
  });
});
