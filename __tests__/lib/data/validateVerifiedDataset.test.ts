import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";

const full = verifiedJson as VerifiedDataset;

describe("validateVerifiedDataset", () => {
  it("passes for minimal verified JSON slice (success)", () => {
    const report = validateVerifiedDataset(minimalVerifiedDataset);
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.stats.dealsTotal).toBe(1);
    expect(report.yearCounts.some((y) => y.year === 2021)).toBe(true);
  });

  it("errors on broken target FK (error)", () => {
    const broken = structuredClone(minimalVerifiedDataset);
    broken.acquisitions[0].targetId = "missing-id";
    const report = validateVerifiedDataset(broken);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === "deal.targetFk")).toBe(true);
  });

  it("errors on duplicate deal id (error)", () => {
    const dup = structuredClone(minimalVerifiedDataset);
    dup.acquisitions.push({ ...dup.acquisitions[0] });
    const report = validateVerifiedDataset(dup);
    expect(report.errors.some((e) => e.code === "deal.duplicateId")).toBe(true);
  });

  it("errors on invalid announcedDate format (error)", () => {
    const badDate = structuredClone(minimalVerifiedDataset);
    badDate.acquisitions[0].announcedDate = "05/19/2021";
    const report = validateVerifiedDataset(badDate);
    expect(report.errors.some((e) => e.code === "deal.announcedDate")).toBe(
      true,
    );
  });

  it("errors on missing deal source (error)", () => {
    const noSource = structuredClone(minimalVerifiedDataset);
    noSource.acquisitions[0].source = "";
    const report = validateVerifiedDataset(noSource);
    expect(report.errors.some((e) => e.code === "deal.source")).toBe(true);
  });

  it("errors on invalid provenance lastUpdated (error)", () => {
    const badProv = structuredClone(minimalVerifiedDataset);
    badProv.provenance.lastUpdated = "2026/05/30";
    const report = validateVerifiedDataset(badProv);
    expect(report.errors.some((e) => e.code === "provenance.lastUpdated")).toBe(
      true,
    );
  });

  it("errors when provenance disclaimer is empty (error)", () => {
    const noDisclaimer = structuredClone(minimalVerifiedDataset);
    noDisclaimer.provenance.disclaimer = "   ";
    const report = validateVerifiedDataset(noDisclaimer);
    expect(report.errors.some((e) => e.code === "provenance.disclaimer")).toBe(
      true,
    );
  });

  it("warns on single-source companies (warning)", () => {
    const singleSource = structuredClone(minimalVerifiedDataset);
    singleSource.companies = singleSource.companies.map((c) => ({
      ...c,
      sources: c.sources?.slice(0, 1) ?? [],
    }));
    const report = validateVerifiedDataset(singleSource);
    expect(report.warnings.some((w) => w.code === "company.singleSource")).toBe(
      true,
    );
  });

  it("warns on corporate acquirer id (warning)", () => {
    const corporate = structuredClone(minimalVerifiedDataset);
    const corporateAcquirer = full.companies.find((c) => c.id === "c39");
    if (!corporateAcquirer) {
      throw new Error("fixture c39 missing from verified dataset");
    }
    corporate.companies.push(corporateAcquirer);
    corporate.acquisitions[0].acquirerId = "c39";
    const report = validateVerifiedDataset(corporate);
    expect(report.warnings.some((w) => w.code === "deal.corporateAcquirer"))
      .toBe(true);
  });

  it("warns when deal has no value and no note (warning)", () => {
    const undisclosed = structuredClone(minimalVerifiedDataset);
    undisclosed.acquisitions[0].dealValue = undefined;
    undisclosed.acquisitions[0].dealValueNote = "";
    const report = validateVerifiedDataset(undisclosed);
    expect(report.warnings.some((w) => w.code === "deal.undisclosedNote")).toBe(
      true,
    );
  });

  it("warns on valuation without valuationSource (warning)", () => {
    const noValSource = structuredClone(minimalVerifiedDataset);
    noValSource.companies[0].valuationSource = "";
    const report = validateVerifiedDataset(noValSource);
    expect(report.warnings.some((w) => w.code === "company.valuationSource"))
      .toBe(true);
  });

  it("warns on sector with companies but no deals (warning)", () => {
    const extraSector = structuredClone(minimalVerifiedDataset);
    extraSector.companies.push({
      ...extraSector.companies[0],
      id: "c99",
      name: "Extra Co",
      sector: "Menopause",
    });
    extraSector.companies.push({
      ...extraSector.companies[0],
      id: "c98",
      name: "Extra Co 2",
      sector: "Menopause",
    });
    extraSector.companies.push({
      ...extraSector.companies[0],
      id: "c97",
      name: "Extra Co 3",
      sector: "Menopause",
    });
    const report = validateVerifiedDataset(extraSector);
    expect(report.warnings.some((w) => w.code === "stats.sectorNoDeals")).toBe(
      true,
    );
  });
});
