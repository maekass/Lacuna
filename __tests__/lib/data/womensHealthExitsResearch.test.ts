import { describe, expect, it } from "vitest";
import {
  AOA_EXIT_SECTORS,
  KEARNEY_WH_INVESTMENT,
  WOMENS_HEALTH_EXITS_HEADLINE,
} from "@/data/womensHealthExitsResearch";
import { BURDEN_CAPITAL_GAP_DATA } from "@/data/burdenCapitalGap";

describe("womensHealthExitsResearch", () => {
  it("headline stats match Forbes / AOA Dx citations", () => {
    expect(WOMENS_HEALTH_EXITS_HEADLINE.totalExitValueMinB).toBe(100);
    expect(WOMENS_HEALTH_EXITS_HEADLINE.exitCount).toBe(276);
    expect(WOMENS_HEALTH_EXITS_HEADLINE.billionDollarDealCount).toBe(27);
    expect(WOMENS_HEALTH_EXITS_HEADLINE.exitValue2025B).toBe(27);
    expect(WOMENS_HEALTH_EXITS_HEADLINE.maSharePct).toBe(91);
  });

  it("AOA sector exits sum to cited oncology + gynecologic buckets", () => {
    const total = AOA_EXIT_SECTORS.reduce((s, x) => s + x.exitValueB, 0);
    expect(total).toBeCloseTo(53.6, 1);
  });

  it("Kearney investment splits sum to $34B total", () => {
    const split = KEARNEY_WH_INVESTMENT.womenSpecificConditionsB +
      KEARNEY_WH_INVESTMENT.disproportionatelyAffectingWomenB;
    expect(split).toBe(KEARNEY_WH_INVESTMENT.totalPrivateInvestmentB);
  });

  it("BCG burden-capital rows include AOA exit crosswalk on mapped sectors", () => {
    expect(
      BURDEN_CAPITAL_GAP_DATA.find((r) => r.id === "womens-cancers")
        ?.exitValueM,
    ).toBe(24_000);
    expect(
      BURDEN_CAPITAL_GAP_DATA.find((r) => r.id === "reproductive-health")
        ?.exitValueM,
    ).toBe(29_600);
    expect(
      BURDEN_CAPITAL_GAP_DATA.find((r) => r.id === "mental-health")?.exitValueM,
    ).toBeNull();
  });
});
