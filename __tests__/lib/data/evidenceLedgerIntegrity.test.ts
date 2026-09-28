import { describe, expect, it } from "vitest";
import rawDataset from "@/data/dataset.verified.json";
import rawLedger from "@/data/evidence.verified.json";
import { parseVerifiedDataset } from "@/lib/data/datasetSchema";
import { parseEconomicEvidenceLedger } from "@/lib/data/evidenceLedger";
import {
  inferEconomicDisclosure,
  inferEconomicValueBasis,
  validateEconomicEvidenceLedger,
} from "@/lib/data/evidenceLedgerIntegrity";

describe("economic evidence ledger integrity", () => {
  const ledger = parseEconomicEvidenceLedger(rawLedger);
  const dataset = parseVerifiedDataset(rawDataset);

  it("accepts the static ledger (success)", () => {
    expect(validateEconomicEvidenceLedger(ledger, dataset)).toEqual([]);
  });

  it("keeps stored dollars and labels figures the citation does not state as a point (success)", () => {
    const byId = new Map(ledger.records.map((record) => [record.id, record]));

    expect(byId.get("c1:totalFunding:v1")).toMatchObject({
      value: 155,
      valueBasis: "locator_only",
      publicAsOfDate: null,
      sourceUrl: "https://www.crunchbase.com/organization/modern-fertility",
    });
    expect(byId.get("c1:lastKnownValuation:v1")).toMatchObject({
      value: 225,
      valueBasis: "range_high",
      effectiveDate: "2021-05-01",
      publicAsOfDate: "2021-05-31",
    });
    expect(byId.get("c4:lastKnownValuation:v1")).toMatchObject({
      value: 1000,
      valueBasis: "at_least",
      effectiveDate: "2021-08-01",
      publicAsOfDate: "2021-08-31",
    });
    expect(byId.get("c7:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2023-03-31",
    );
    expect(byId.get("c23:lastKnownValuation:v1")).toMatchObject({
      value: 13900,
      valueBasis: "stated",
      effectiveDate: "2021-03-01",
      publicAsOfDate: "2021-03-01",
      datePrecision: "day",
    });
    expect(byId.get("c25:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2024-07-25",
    );
    expect(byId.get("c26:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2024-10-31",
    );
    expect(byId.get("c38:lastKnownValuation:v1")).toMatchObject({
      value: 5300,
      valueBasis: "fully_diluted",
    });
    expect(byId.get("c39:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2018-04-06",
    );
    expect(byId.get("c45:lastKnownValuation:v1")).toMatchObject({
      value: 275,
      valueBasis: "up_to",
    });
    expect(byId.get("c65:lastKnownValuation:v1")).toMatchObject({
      value: 56,
      valueBasis: "up_to",
    });
    expect(byId.get("c73:lastKnownValuation:v1")).toMatchObject({
      value: 1100,
      valueBasis: "enterprise_value",
      publicAsOfDate: "2023-07-29",
    });
    expect(byId.get("c76:totalFunding:v1")).toMatchObject({
      value: 19,
      valueBasis: "sum_of_cited_rounds",
      publicAsOfDate: "2023-09-30",
    });
    expect(byId.get("c79:totalFunding:v1")).toMatchObject({
      value: 4.5,
      valueBasis: "unstated_conflict",
      publicAsOfDate: null,
    });
    expect(byId.get("c84:totalFunding:v1")).toMatchObject({
      value: 4.3,
      valueBasis: "unquoted_fx",
      publicAsOfDate: null,
    });
  });

  it("uses the announcement window unless the figure is a close value (success)", () => {
    const announced =
      "SEC 8-K filing (Teladoc, Aug 5, 2020 announcement; Oct 30, 2020 close)";
    const closeValue =
      "Teladoc/Livongo merger close value (Oct 30, 2020) — SEC 8-K";
    expect(inferEconomicDisclosure(announced, "locator_only")).toMatchObject({
      datePrecision: "unknown",
      effectiveDate: null,
      publicAsOfDate: null,
    });
    expect(inferEconomicDisclosure(closeValue, "locator_only")).toMatchObject({
      datePrecision: "unknown",
      effectiveDate: null,
      publicAsOfDate: null,
    });
    expect(inferEconomicDisclosure(
      "Acquisition value $8B cash + stock (Illumina press release, Sep 2020; completed Aug 2021)",
      "stated",
    )).toMatchObject({
      datePrecision: "month",
      effectiveDate: "2020-09-01",
      publicAsOfDate: "2020-09-30",
    });
  });

  it("does not take a day from an aggregator line or a fiscal-year label (success)", () => {
    const citation =
      "Acquisition price ~$350M (Hologic press release, Oct 2024)";
    expect(inferEconomicValueBasis(citation, 350)).toBe("approximate");
    expect(inferEconomicDisclosure(citation, "approximate", [
      "Tracxn - Hologic acquisition list (Oct 14, 2024)",
    ])).toMatchObject({
      datePrecision: "month",
      publicAsOfDate: "2024-10-31",
    });
    expect(
      inferEconomicDisclosure(
        "Acquisition price ~$147M net of cash (SEC 10-K, CooperCompanies FY2012)",
        "approximate",
      ).datePrecision,
    ).toBe("unknown");
  });

  it("labels ranges, unquoted FX, round sums, and contradicted totals (success)", () => {
    expect(inferEconomicValueBasis("est. $150-225M", 225)).toBe("range_high");
    expect(inferEconomicValueBasis(
      "EU-Startups - €2.9M raise, €3.8M total coverage (July 2023)",
      4.3,
    )).toBe("unquoted_fx");
    const rounds =
      "TechCrunch - $5M seed coverage (July 2021); Business Wire - $14M Series A announcement (September 2023)";
    expect(inferEconomicValueBasis(rounds, 19)).toBe("sum_of_cited_rounds");
    expect(
      inferEconomicDisclosure(rounds, "sum_of_cited_rounds").publicAsOfDate,
    )
      .toBe("2023-09-30");
    expect(inferEconomicValueBasis(
      "GeekWire - acquisition coverage (October 2022)",
      4.5,
      ["Tracxn - funding history ($4.12M over 4 rounds)"],
    )).toBe("unstated_conflict");
    expect(inferEconomicValueBasis(
      "€35M upfront + €15M milestones (~$56M total potential; press release, May 2016)",
      56,
    )).toBe("up_to");
    expect(inferEconomicValueBasis(
      "$75M upfront + up to $879M in milestones (Organon press release, Dec 2021)",
      75,
    )).toBe("upfront");
  });

  it("rejects a null vintage when the citation names a month (error)", () => {
    const dataset = parseVerifiedDataset({
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
    const issues = validateEconomicEvidenceLedger(
      parseEconomicEvidenceLedger({
        schemaVersion: "1.0",
        records: [{
          id: "c-test:totalFunding:v1",
          companyId: "c-test",
          field: "totalFunding",
          value: 10,
          unit: "USD_M",
          valueBasis: "stated",
          sourceCitation: "Company press release, $10M (Jan 2021)",
          effectiveDate: null,
          publicAsOfDate: null,
          datePrecision: "unknown",
          verificationStatus: "reported",
          recordedAt: "2026-09-20",
        }],
      }),
      dataset,
    );
    expect(issues.some((issue) => issue.code === "disclosure")).toBe(true);
  });

  it("does not lend an acquisition filing date to a funding total the filing does not state (success)", () => {
    const byId = new Map(ledger.records.map((record) => [record.id, record]));
    const undatedFunding = [
      "c13:totalFunding:v1",
      "c23:totalFunding:v1",
      "c28:totalFunding:v1",
      "c31:totalFunding:v1",
      "c35:totalFunding:v1",
      "c64:totalFunding:v1",
      "c74:totalFunding:v1",
    ];
    for (const id of undatedFunding) {
      expect(byId.get(id), id).toMatchObject({
        valueBasis: "unstated_conflict",
        datePrecision: "unknown",
        publicAsOfDate: null,
      });
    }
    expect(byId.get("c13:lastKnownValuation:v1")).toMatchObject({
      value: 400,
      valueBasis: "stated",
      publicAsOfDate: "2021-10-22",
    });
    expect(byId.get("c23:lastKnownValuation:v1")).toMatchObject({
      value: 13900,
      valueBasis: "approximate",
      publicAsOfDate: "2020-10-30",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1477449/000110465920090575/tm2026658d1_8k.htm",
    });
    expect(byId.get("c68:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2012-08-01",
    );
    expect(byId.get("c69:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2020-08-11",
    );
    expect(byId.get("c75:lastKnownValuation:v1")?.publicAsOfDate).toBe(
      "2024-01-31",
    );
  });

  it("rejects a dated funding locator that never quotes the total (error)", () => {
    const dataset = parseVerifiedDataset({
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
    const issues = validateEconomicEvidenceLedger(
      parseEconomicEvidenceLedger({
        schemaVersion: "1.0",
        records: [{
          id: "c-test:totalFunding:v1",
          companyId: "c-test",
          field: "totalFunding",
          value: 25,
          unit: "USD_M",
          valueBasis: "locator_only",
          sourceCitation: "Acquirer press release (Mar 30, 2021)",
          effectiveDate: "2021-03-30",
          publicAsOfDate: "2021-03-30",
          datePrecision: "day",
          verificationStatus: "reported",
          recordedAt: "2026-09-20",
        }],
      }),
      dataset,
    );
    expect(issues.some((issue) => issue.code === "locator-dated")).toBe(
      true,
    );
  });
});
