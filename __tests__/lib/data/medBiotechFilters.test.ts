import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  applyConsumerHealthScope,
  applyDatasetScope,
  applyMedBiotechScope,
  isConsumerHealthRelevantCompany,
  isMedBiotechRelevantCompany,
} from "@/lib/data/medBiotechFilters";

const full = verifiedJson as VerifiedDataset;

describe("medBiotechFilters", () => {
  it("excludes wearables and consumer wellness brands from med/biotech scope", () => {
    expect(
      isMedBiotechRelevantCompany({
        name: "Oura",
        sector: "Wearables",
        evidenceClass: "consumer_wellness",
      }),
    ).toBe(false);
    expect(
      isConsumerHealthRelevantCompany({
        name: "Oura",
        sector: "Wearables",
        evidenceClass: "consumer_wellness",
      }),
    ).toBe(true);
  });

  it("keeps biotech portfolio holdings in med/biotech scope", () => {
    const hera = full.companies.find((c) => c.name === "Hera Biotech");
    expect(hera).toBeDefined();
    expect(isMedBiotechRelevantCompany(hera!)).toBe(true);
    expect(isConsumerHealthRelevantCompany(hera!)).toBe(false);
  });

  it("partitions the full catalog without overlap", () => {
    const med = applyMedBiotechScope(full);
    const consumer = applyConsumerHealthScope(full);
    expect(med.companies).toHaveLength(99);
    expect(consumer.companies).toHaveLength(51);
    expect(med.companies.length + consumer.companies.length).toBe(
      full.companies.length,
    );
    expect(med.acquisitions).toHaveLength(51);
    expect(consumer.acquisitions).toHaveLength(8);
  });

  it("applyDatasetScope matches dedicated helpers", () => {
    expect(applyDatasetScope(full, "med_biotech").companies.length).toBe(99);
    expect(applyDatasetScope(full, "consumer_health").companies.length).toBe(
      51,
    );
  });
});
