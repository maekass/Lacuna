import { describe, expect, it } from "vitest";
import rawDataset from "@/data/dataset.verified.json";
import rawLedger from "@/data/evidence.verified.json";
import {
  applyEconomicEvidenceLedger,
  economicEvidenceAtDecisionDate,
  parseEconomicEvidenceLedger,
} from "@/lib/data/evidenceLedger";
import { parseVerifiedDataset } from "@/lib/data/datasetSchema";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

describe("economic evidence ledger", () => {
  it("is the static source for current funding and valuation fields", () => {
    expect(
      rawDataset.companies.some((company) =>
        "totalFunding" in company || "lastKnownValuation" in company
      ),
    ).toBe(false);

    const ledger = parseEconomicEvidenceLedger(rawLedger);
    expect(ledger.records.length).toBeGreaterThan(0);
    const staticDataset = getStaticVerifiedDataset();
    const modernFertility = staticDataset.companies.find((company) =>
      company.id === "c1"
    );
    expect(modernFertility).toMatchObject({
      totalFunding: 155,
      lastKnownValuation: 225,
    });
  });

  it("preserves corrections and refuses two active values for the same field", () => {
    const base = parseVerifiedDataset({
      provenance: {
        lastUpdated: "2026-09-20",
        sources: ["test"],
        notes: [],
        purpose: "test",
        disclaimer: "test",
      },
      companies: [{
        id: "c-test",
        name: "Test",
        sector: "Test",
        stage: "Seed",
      }],
      acquirers: [],
      acquisitions: [],
    });
    const earlier = {
      id: "c-test:totalFunding:v1",
      companyId: "c-test",
      field: "totalFunding" as const,
      value: 10,
      unit: "USD_M" as const,
      sourceCitation: "Company release",
      effectiveDate: "2020-01-01",
      publicAsOfDate: "2020-01-01",
      datePrecision: "day" as const,
      verificationStatus: "verified" as const,
      recordedAt: "2026-09-20",
    };
    const corrected = {
      ...earlier,
      id: "c-test:totalFunding:v2",
      value: 12,
      supersedesId: earlier.id,
    };
    expect(
      applyEconomicEvidenceLedger(base, {
        schemaVersion: "1.0",
        records: [earlier, corrected],
      })
        .companies[0].totalFunding,
    ).toBe(12);
    expect(() =>
      applyEconomicEvidenceLedger(base, {
        schemaVersion: "1.0",
        records: [earlier, { ...earlier, id: "c-test:totalFunding:conflict" }],
      })
    ).toThrow(/More than one current evidence record/);
  });

  it("keeps current catalog values out of historical snapshots until their public vintage is captured", () => {
    const ledger = parseEconomicEvidenceLedger(rawLedger);
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c1",
      "totalFunding",
      "2021-05-18",
    )).toEqual({ eligible: false, reason: "missing-provenance" });

    const dated = {
      ...ledger.records.find((record) => record.id === "c1:totalFunding:v1")!,
      publicAsOfDate: "2021-05-18",
      effectiveDate: "2021-05-18",
      datePrecision: "day" as const,
    };
    expect(economicEvidenceAtDecisionDate(
      { schemaVersion: "1.0", records: [dated] },
      "c1",
      "totalFunding",
      "2021-05-18",
    )).toMatchObject({ eligible: true, evidence: { value: 155 } });
  });

  it("admits a cited window only after that window is known to have been public", () => {
    const ledger = parseEconomicEvidenceLedger(rawLedger);

    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c23",
      "lastKnownValuation",
      "2020-08-05",
    )).toEqual({ eligible: false, reason: "after-cutoff" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c23",
      "lastKnownValuation",
      "2020-10-30",
    )).toEqual({ eligible: false, reason: "after-cutoff" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c23",
      "lastKnownValuation",
      "2021-03-01",
    )).toMatchObject({ eligible: true, evidence: { value: 13900 } });

    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c4",
      "lastKnownValuation",
      "2021-08-30",
    )).toEqual({ eligible: false, reason: "imprecise-date" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c4",
      "lastKnownValuation",
      "2021-08-31",
    )).toEqual({ eligible: false, reason: "imprecise-date" });

    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c76",
      "totalFunding",
      "2021-07-31",
    )).toEqual({ eligible: false, reason: "imprecise-date" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c79",
      "totalFunding",
      "2022-10-31",
    )).toEqual({ eligible: false, reason: "missing-provenance" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c84",
      "totalFunding",
      "2023-07-31",
    )).toEqual({ eligible: false, reason: "missing-provenance" });

    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c23",
      "totalFunding",
      "2020-10-30",
    )).toEqual({ eligible: false, reason: "missing-provenance" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c13",
      "totalFunding",
      "2021-10-22",
    )).toEqual({ eligible: false, reason: "missing-provenance" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c13",
      "lastKnownValuation",
      "2021-10-21",
    )).toEqual({ eligible: false, reason: "after-cutoff" });
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c13",
      "lastKnownValuation",
      "2021-10-22",
    )).toMatchObject({ eligible: true, evidence: { value: 400 } });
  });
});
