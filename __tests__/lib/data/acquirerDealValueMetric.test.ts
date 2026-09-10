import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  ACQUIRER_DEAL_VALUE_MIN_N,
  buildAcquirerDealValueView,
} from "@/lib/data/acquirerDealValueMetric";

function disclosedFor(acquirerId: string) {
  const dataset = getStaticVerifiedDataset();
  const deals = dataset.acquisitions.filter((deal) =>
    deal.acquirerId === acquirerId
  );
  const disclosed = deals
    .filter((deal): deal is typeof deal & { dealValue: number } =>
      typeof deal.dealValue === "number"
    )
    .map((deal) => ({
      dealValue: deal.dealValue,
      announcedDate: deal.announcedDate,
    }));
  return { deals, disclosed };
}

describe("buildAcquirerDealValueView", () => {
  it("withholds a dollar figure when disclosed n < 5", () => {
    const dataset = getStaticVerifiedDataset();
    const belowFloor = dataset.acquirers.filter((acquirer) => {
      const { disclosed } = disclosedFor(acquirer.id);
      return disclosed.length > 0 &&
        disclosed.length < ACQUIRER_DEAL_VALUE_MIN_N;
    });
    expect(belowFloor.length).toBeGreaterThan(0);
    for (const acquirer of belowFloor) {
      const { deals, disclosed } = disclosedFor(acquirer.id);
      const view = buildAcquirerDealValueView(deals.length, disclosed);
      expect(view.provenance.estimate.kind).toBe("insufficient");
      expect(view.populationLabel).toMatch(/nominal USD/);
      expect(view.populationLabel).toMatch(/\d{4}/);
      expect(view.trackedDealsLabel).toContain(
        `${disclosed.length} with disclosed value`,
      );
    }
  });

  it("uses disclosed n as the denominator, not tracked deal count", () => {
    const { deals, disclosed } = disclosedFor("acquirer-teladoc");
    expect(deals.length).not.toBe(disclosed.length);
    const view = buildAcquirerDealValueView(deals.length, disclosed);
    expect(view.trackedDealsLabel).toBe(
      `${deals.length} deals tracked · ${disclosed.length} with disclosed value`,
    );
  });

  it("publishes a mean only at n ≥ 5", () => {
    const view = buildAcquirerDealValueView(6, [
      { dealValue: 100, announcedDate: "2018-01-01" },
      { dealValue: 120, announcedDate: "2019-01-01" },
      { dealValue: 80, announcedDate: "2020-01-01" },
      { dealValue: 90, announcedDate: "2021-01-01" },
      { dealValue: 110, announcedDate: "2024-01-01" },
    ]);
    expect(view.provenance.estimate.kind).toBe("sufficient");
    if (view.provenance.estimate.kind === "sufficient") {
      expect(view.provenance.estimate.value).toBe(100);
      expect(view.provenance.estimate.sampleSize).toBe(5);
    }
    expect(view.populationLabel).toContain("2018–2024");
  });
});
