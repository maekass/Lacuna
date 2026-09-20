import { describe, expect, it } from "vitest";
import { applyDatasetScope } from "@/lib/data/medBiotechFilters";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  buildSectorDealIntel,
  medianDisclosedDealValueM,
  SECTOR_DEAL_TABLE_LIMIT,
  type SectorDealAcquisition,
  type SectorDealCompany,
  sectorKey,
} from "@/lib/data/sectorDealIntel";

const companies: SectorDealCompany[] = [
  { id: "c-breast", sector: "Breast Health" },
  { id: "c-diag", sector: "Diagnostics" },
  { id: "c-meno", sector: "Menopause" },
  { id: "c-nested", sector: "Fertility / IVF" },
];

const acquisitions: SectorDealAcquisition[] = [
  {
    id: "d-sividon",
    targetId: "c-breast",
    targetName: "Sividon Diagnostics",
    acquirerName: "Hologic",
    announcedDate: "2012-01-01",
    dealValue: 100,
  },
  {
    id: "d-counsyl",
    targetId: "c-diag",
    targetName: "Counsyl",
    acquirerName: "Myriad",
    announcedDate: "2018-06-01",
    dealValue: 375,
  },
  {
    id: "d-kandy",
    targetId: "c-meno",
    targetName: "KaNDy Therapeutics",
    acquirerName: "Bayer",
    announcedDate: "2020-08-01",
    dealValue: 425,
  },
  {
    id: "d-ivf",
    targetId: "c-nested",
    targetName: "Example IVF Clinic",
    acquirerName: "KKR",
    announcedDate: "2023-01-01",
    dealValue: 50,
  },
];

describe("sectorKey", () => {
  it("uses the primary label before a slash suffix (success)", () => {
    expect(sectorKey("Fertility / IVF")).toBe("Fertility");
    expect(sectorKey("Breast Health")).toBe("Breast Health");
  });
});

describe("medianDisclosedDealValueM", () => {
  it("returns the middle value for odd n (success)", () => {
    expect(medianDisclosedDealValueM([3, 1, 2])).toBe(2);
  });

  it("averages the two central values for even n (success)", () => {
    expect(medianDisclosedDealValueM([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns null for an empty list (edge)", () => {
    expect(medianDisclosedDealValueM([])).toBeNull();
  });

  it("does not mutate the input array (edge)", () => {
    const values = [3, 1];
    medianDisclosedDealValueM(values);
    expect(values).toEqual([3, 1]);
  });
});

describe("buildSectorDealIntel", () => {
  it("joins deals by targetId sector, not target name (success)", () => {
    const breast = buildSectorDealIntel(
      "Breast Health",
      companies,
      acquisitions,
    );
    const diagnostics = buildSectorDealIntel(
      "Diagnostics",
      companies,
      acquisitions,
    );
    const therapeutics = buildSectorDealIntel(
      "Therapeutics",
      companies,
      acquisitions,
    );
    const menopause = buildSectorDealIntel(
      "Menopause",
      companies,
      acquisitions,
    );

    expect(breast.dealCount).toBe(1);
    expect(breast.deals.map((d) => d.id)).toEqual(["d-sividon"]);
    expect(diagnostics.dealCount).toBe(1);
    expect(diagnostics.deals.map((d) => d.id)).toEqual(["d-counsyl"]);
    expect(therapeutics.dealCount).toBe(0);
    expect(therapeutics.deals).toEqual([]);
    expect(menopause.dealCount).toBe(1);
    expect(menopause.deals.map((d) => d.id)).toEqual(["d-kandy"]);
  });

  it("groups slash-suffixed company sectors under the primary key (success)", () => {
    const fertility = buildSectorDealIntel(
      "Fertility",
      companies,
      acquisitions,
    );
    expect(fertility.companyCount).toBe(1);
    expect(fertility.dealCount).toBe(1);
    expect(fertility.deals[0]?.id).toBe("d-ivf");
  });

  it("reports full dealCount when the table slice is capped (edge)", () => {
    const manyCompanies: SectorDealCompany[] = Array.from(
      { length: SECTOR_DEAL_TABLE_LIMIT + 3 },
      (_, i) => ({ id: `c${i}`, sector: "Fertility" }),
    );
    const manyDeals: SectorDealAcquisition[] = manyCompanies.map((c, i) => ({
      id: `d${i}`,
      targetId: c.id,
      targetName: `Target ${i}`,
      acquirerName: `Acquirer ${i}`,
      announcedDate: `2020-01-${String(i + 1).padStart(2, "0")}`,
      dealValue: i + 1,
    }));
    const row = buildSectorDealIntel("Fertility", manyCompanies, manyDeals);

    expect(row.dealCount).toBe(SECTOR_DEAL_TABLE_LIMIT + 3);
    expect(row.deals).toHaveLength(SECTOR_DEAL_TABLE_LIMIT);
    expect(row.disclosedCount).toBe(SECTOR_DEAL_TABLE_LIMIT + 3);
    expect(row.deals[0]?.id).toBe(`d${SECTOR_DEAL_TABLE_LIMIT + 2}`);
  });

  it("returns empty deals when no target matches the sector (edge)", () => {
    const row = buildSectorDealIntel("Wearables", companies, acquisitions);
    expect(row.companyCount).toBe(0);
    expect(row.dealCount).toBe(0);
    expect(row.medianDealValueM).toBeNull();
    expect(row.acquirers).toEqual([]);
  });
});

describe("buildSectorDealIntel on verified dataset", () => {
  it("does not leave Breast Health empty via name matching (success)", () => {
    const dataset = getStaticVerifiedDataset();
    const breast = buildSectorDealIntel(
      "Breast Health",
      dataset.companies,
      dataset.acquisitions,
    );
    expect(breast.companyCount).toBeGreaterThan(0);
    expect(breast.dealCount).toBeGreaterThan(0);
    expect(breast.dealCount).toBeGreaterThanOrEqual(breast.deals.length);
    expect(breast.deals.some((d) => d.targetName.includes("Sividon"))).toBe(
      true,
    );
  });

  it("keeps care-delivery fertility exits out of default med/biotech scope (edge)", () => {
    const full = getStaticVerifiedDataset();
    const scoped = applyDatasetScope(full, "med_biotech");
    const fullFertility = buildSectorDealIntel(
      "Fertility",
      full.companies,
      full.acquisitions,
    );
    const scopedFertility = buildSectorDealIntel(
      "Fertility",
      scoped.companies,
      scoped.acquisitions,
    );
    expect(fullFertility.dealCount).toBe(12);
    expect(scopedFertility.dealCount).toBe(9);
    expect(
      scopedFertility.deals.some((d) => d.targetName.includes("Maven")),
    ).toBe(false);
  });

  it("keeps portfolio Diagnostic companies out of acquired Diagnostics deals (success)", () => {
    const dataset = getStaticVerifiedDataset();
    const portfolio = buildSectorDealIntel(
      "Diagnostic (portfolio)",
      dataset.companies,
      dataset.acquisitions,
    );
    const diagnostics = buildSectorDealIntel(
      "Diagnostics",
      dataset.companies,
      dataset.acquisitions,
    );
    expect(portfolio.companyCount).toBe(7);
    expect(portfolio.dealCount).toBe(0);
    expect(diagnostics.dealCount).toBe(11);
    expect(diagnostics.deals.some((d) => d.targetName.includes("Sividon")))
      .toBe(false);
  });
});
