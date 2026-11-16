import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import { parseStaticVerifiedDatasetJson } from "@/lib/data/staticDataset";
import {
  findSectorLabelVariants,
  validateDatasetConsistency,
} from "@/lib/data/validateDatasetConsistency";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";
import { minimalVerifiedDataset } from "../../helpers/fixtures";

const full = parseStaticVerifiedDatasetJson(verifiedJson);

function codes(dataset: typeof minimalVerifiedDataset): string[] {
  const { errors, warnings } = validateDatasetConsistency(dataset);
  return [...errors, ...warnings].map((i) => i.code);
}

describe("validateDatasetConsistency", () => {
  it("finds no consistency errors in the verified dataset", () => {
    expect(validateDatasetConsistency(full).errors).toEqual([]);
  });

  it("only warns about sector label variants on the verified dataset", () => {
    const { warnings } = validateDatasetConsistency(full);
    expect(new Set(warnings.map((w) => w.code))).toEqual(
      new Set(["company.sectorLabelVariant"]),
    );
  });

  it("errors on duplicate company id", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.companies.push({ ...ds.companies[0], name: "Other" });
    expect(codes(ds)).toContain("company.duplicateId");
  });

  it("errors on duplicate acquirer id", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquirers.push({ ...ds.acquirers[0] });
    expect(codes(ds)).toContain("acquirer.duplicateId");
  });

  it("errors when a company and an acquirer share an id", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquirers.push({ ...ds.acquirers[0], id: ds.companies[1].id });
    expect(codes(ds)).toContain("entity.idCollision");
  });

  it("warns on duplicate company names ignoring case and spacing", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.companies[1].name = `  ${ds.companies[0].name.toUpperCase()} `;
    expect(codes(ds)).toContain("company.duplicateName");
  });

  it("errors when closedDate precedes announcedDate", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions[0].announcedDate = "2021-05-19";
    ds.acquisitions[0].closedDate = "2021-05-01";
    expect(codes(ds)).toContain("deal.closedBeforeAnnounced");
  });

  it("errors on deal dates after provenance.lastUpdated", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.provenance.lastUpdated = "2020-01-01";
    expect(codes(ds)).toContain("deal.futureDate");
  });

  it("errors on non-positive deal values", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions[0].dealValue = 0;
    expect(codes(ds)).toContain("deal.nonPositiveValue");
  });

  it("errors when the target was founded after the deal year", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    const targetId = ds.acquisitions[0].targetId;
    const target = ds.companies.find((c) => c.id === targetId);
    if (!target) throw new Error("fixture target missing");
    target.founded = Number(ds.acquisitions[0].announcedDate.slice(0, 4)) + 1;
    expect(codes(ds)).toContain("deal.targetFoundedAfterDeal");
  });

  it("errors when a deal target is not outcomeType acquired", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    const target = ds.companies.find((c) =>
      c.id === ds.acquisitions[0].targetId
    );
    if (!target) throw new Error("fixture target missing");
    target.outcomeType = "unknown";
    expect(codes(ds)).toContain("deal.targetOutcome");
  });

  it("warns when an acquired company has no verified deal", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions = [];
    expect(codes(ds)).toContain("company.acquiredWithoutDeal");
  });

  it("warns on repeated target/acquirer pairs", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions.push({ ...ds.acquisitions[0], id: "deal-copy" });
    expect(codes(ds)).toContain("deal.duplicatePair");
  });

  it("warns on target/acquirer names unrelated to the linked records", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions[0].targetName = "Unrelated Co";
    ds.acquisitions[0].acquirerName = "Someone Else";
    expect(codes(ds)).toEqual(
      expect.arrayContaining(["deal.targetName", "deal.acquirerName"]),
    );
  });

  it("accepts deal-time name variants that contain the canonical name", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions[0].acquirerName = `${
      ds.acquirers[0].name
    } (via subsidiary)`;
    expect(codes(ds)).not.toContain("deal.acquirerName");
  });

  it("surfaces consistency issues through validateVerifiedDataset", () => {
    const ds = structuredClone(minimalVerifiedDataset);
    ds.acquisitions[0].dealValue = -1;
    const report = validateVerifiedDataset(ds);
    expect(report.ok).toBe(false);
    expect(report.errors.map((e) => e.code)).toContain(
      "deal.nonPositiveValue",
    );
  });
});

describe("findSectorLabelVariants", () => {
  it("pairs plural/parenthetical and first-word variants", () => {
    expect(
      findSectorLabelVariants([
        "Diagnostics",
        "Diagnostic (portfolio)",
        "Reproductive",
        "Reproductive Health",
        "Wellness",
        "Sexual Wellness",
      ]),
    ).toEqual([
      ["Diagnostic (portfolio)", "Diagnostics"],
      ["Reproductive", "Reproductive Health"],
    ]);
  });
});
