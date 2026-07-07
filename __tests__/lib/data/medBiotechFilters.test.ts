import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  applyMedBiotechScope,
  isMedBiotechRelevantCompany,
} from "@/lib/data/medBiotechFilters";

const dataset = verifiedJson as VerifiedDataset;

describe("medBiotechFilters", () => {
  it("excludes wearables and consumer wellness brands", () => {
    expect(
      isMedBiotechRelevantCompany({
        name: "Oura",
        sector: "Wearables",
        evidenceClass: "consumer_wellness",
      }),
    ).toBe(false);
    expect(
      isMedBiotechRelevantCompany({
        name: "Everlywell",
        sector: "General Wellness",
        evidenceClass: "consumer_wellness",
      }),
    ).toBe(false);
  });

  it("keeps biotech portfolio holdings and precision medicine deals", () => {
    const hera = dataset.companies.find((c) => c.name === "Hera Biotech");
    const flatiron = dataset.companies.find((c) => c.name === "Flatiron Health");
    expect(hera).toBeDefined();
    expect(flatiron).toBeDefined();
    expect(isMedBiotechRelevantCompany(hera!)).toBe(true);
    expect(isMedBiotechRelevantCompany(flatiron!)).toBe(true);
  });

  it("dataset on disk is already scoped to medicine and biotech", () => {
    const scoped = applyMedBiotechScope(dataset);
    expect(scoped.companies).toHaveLength(dataset.companies.length);
    expect(scoped.acquisitions).toHaveLength(dataset.acquisitions.length);
    expect(dataset.companies.some((c) => c.sector === "Wearables")).toBe(false);
    expect(
      dataset.companies.some((c) => c.evidenceClass === "consumer_wellness"),
    ).toBe(false);
  });
});
