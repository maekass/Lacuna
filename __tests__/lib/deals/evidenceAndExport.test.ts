import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  buildEvidenceLadder,
  FEATURED_DEAL_ID,
  getDealById,
  getDealDetailView,
} from "@/lib/deals";
import { closeDurationDays, premiumPercent } from "@/lib/deals/dealTiming";
import { inferSourceUrl, isEdgarLocatorUrl } from "@/lib/deals/inferSourceUrl";
import { formatDealDate } from "@/lib/deals/formatDealDate";

describe("evidence ladder", () => {
  const dataset = getStaticVerifiedDataset();
  const deal = getDealById(dataset, FEATURED_DEAL_ID);

  it("classifies Biotheranostics sources and promotes the 8-K to primary", () => {
    expect(deal).not.toBeNull();
    const ladder = buildEvidenceLadder(deal!);
    expect(ladder.runs.some((r) => r.citation.includes("Hologic"))).toBe(true);
    expect(ladder.runs.some((r) => r.tier === "primary")).toBe(true);
    expect(ladder.hasDualSource).toBe(true);
    expect(ladder.pressOnly).toBe(false);
    expect(ladder.priceDisclosed).toBe(true);
    const filing = ladder.runs.find((r) => r.tier === "primary");
    expect(filing?.url).toContain("sec.gov");
    expect(filing?.url).toContain("HOLX");
    expect(filing?.urlKind).toBe("edgar_locator");
  });

  it("does not treat two press wires as dual-source", () => {
    expect(deal).not.toBeNull();
    const pressOnlyDeal = {
      ...deal!,
      acquisition: {
        ...deal!.acquisition,
        source:
          "Hologic investor relations press release (Jan 5, 2021); Business Wire (Feb 22, 2021)",
        preDealValuationSource: undefined,
      },
    };
    const ladder = buildEvidenceLadder(pressOnlyDeal);
    expect(ladder.runs.length).toBeGreaterThanOrEqual(2);
    expect(ladder.primaryCount).toBe(0);
    expect(ladder.hasDualSource).toBe(false);
    expect(ladder.pressOnly).toBe(true);
  });
});

describe("deal timing and source locators", () => {
  it("counts calendar days from announcement to close", () => {
    expect(closeDurationDays("2021-01-05", "2021-02-22")).toBe(48);
    expect(closeDurationDays("2021-01-05")).toBeNull();
  });

  it("converts a 1.35× multiple to a 35% premium", () => {
    expect(premiumPercent(1.35)).toBeCloseTo(35);
  });

  it("builds an EDGAR locator from ticker + 8-K citation", () => {
    const url = inferSourceUrl(
      "Hologic 8-K filing, SEC EDGAR — implied pre-deal valuation",
      "HOLX",
    );
    expect(url).toContain("sec.gov");
    expect(url).toContain("HOLX");
    expect(url).toContain("8-K");
    expect(isEdgarLocatorUrl(url!)).toBe(true);
  });

  it("formats verified ISO dates on the UTC calendar", () => {
    expect(formatDealDate("2021-01-05")).toBe("Jan 5, 2021");
    expect(formatDealDate("2021-02-22")).toBe("Feb 22, 2021");
  });
});

describe("formatDealBrief", () => {
  const dataset = getStaticVerifiedDataset();
  const view = getDealDetailView(dataset, FEATURED_DEAL_ID);

  it("includes source citation, premium, and filtered comps", () => {
    expect(view).not.toBeNull();
    const brief = view!.briefMarkdown;
    expect(brief).toContain("Biotheranostics");
    expect(brief).toContain("Hologic");
    expect(brief).toContain("Evidence ladder");
    expect(brief).toContain("not investment advice");
    expect(brief).toContain("Cited empowerment gaps");
    expect(brief).toContain("Hologic investor relations");
    expect(brief).toContain("Valuation peers");
    expect(brief).toContain("Premium: +35%");
    expect(brief).toContain("Close speed: 48 days");
    expect(brief).toContain("Immunomedics");
    expect(brief).toContain("clinical adjacency");
    expect(brief).not.toMatch(/Last known valuation/);
    const peerBlock = brief.split("## Same-sector adjacency")[0];
    expect(peerBlock).not.toMatch(/Immunomedics → Gilead/);
  });
});

describe("getDealDetailView", () => {
  const dataset = getStaticVerifiedDataset();

  it("assembles the featured dossier without hydrating extras as peers", () => {
    const view = getDealDetailView(dataset, FEATURED_DEAL_ID);
    expect(view?.deal.acquisition.targetName).toBe("Biotheranostics");
    expect(view?.closeDays).toBe(48);
    expect(view?.premiumMultiple).toBeCloseTo(1.35);
    expect(view?.comparables.some((c) => c.targetName === "Immunomedics"))
      .toBe(false);
    expect(
      view?.adjacencyNotPeers.some((c) => c.targetName === "Immunomedics"),
    ).toBe(true);
    expect(view?.announcedLabel).toBe("Jan 5, 2021");
    expect(view?.closedLabel).toBe("Feb 22, 2021");
    expect(view?.deal.target.lastKnownValuation).toBe(230);
    expect(view?.deal.acquisition.dealValue).toBe(230);
    expect(view?.targetLastKnownValuation).toBeNull();
    const peerIds = new Set(view!.comparables.map((c) => c.id));
    const adjacencyIds = new Set(view!.adjacencyNotPeers.map((c) => c.id));
    expect(
      view!.acquirerDeals.every((c) =>
        !peerIds.has(c.id) && !adjacencyIds.has(c.id)
      ),
    ).toBe(true);
    expect(
      view!.acquirerDeals.some((c) => c.targetName === "Endomagnetics"),
    ).toBe(false);
    expect(view?.provenanceLine).toContain("verified dataset");
    expect(view?.provenanceLine).toContain("Verify independently");
    expect(
      view?.empowerment.matchedDimensions.every((m) =>
        m.targetMatchTier === "curated"
      ),
    ).toBe(true);
    expect(view?.empowerment.hasDirectMatch).toBe(true);
    expect(view?.regulatoryCitations).toEqual([]);
    expect(view?.briefMarkdown).not.toMatch(
      /ClinicalTrials\.gov|openFDA|CPT /,
    );
  });

  it("shows lastKnownValuation only when it is sourced and distinct from deal price", () => {
    const foundation = getDealDetailView(dataset, "deal21");
    expect(foundation?.deal.acquisition.targetName).toBe("Foundation Medicine");
    expect(foundation?.deal.acquisition.dealValue).toBe(2400);
    expect(foundation?.targetLastKnownValuation?.value).toBe(5300);
    expect(foundation?.targetLastKnownValuation?.source).toMatch(/5\.3B/);
    expect(foundation?.briefMarkdown).toContain(
      "Last known valuation: $5,300M",
    );
    expect(foundation?.briefMarkdown).toContain(
      foundation!.targetLastKnownValuation!.source,
    );
  });
});
