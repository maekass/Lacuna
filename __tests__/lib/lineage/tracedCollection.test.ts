import { describe, expect, it } from "vitest";
import { fromRecords, summarizeLineage } from "@/lib/lineage";

interface Company {
  id: string;
  sources?: string[];
}

const companies: Company[] = [
  { id: "c1", sources: ["company source"] },
  { id: "c2", sources: ["shared source"] },
];

describe("traced lineage collections", () => {
  it("carries dataset identity through estimates", () => {
    const result = fromRecords(
      "acquisitions",
      [{ id: "d1", dealValue: 10 }],
      { datasetVersion: "v8", datasetHash: "a".repeat(64) },
    )
      .map((deal) => deal.dealValue!)
      .estimate("sector.moic.median");

    expect(result.lineage.datasetVersion).toBe("v8");
    expect(result.lineage.datasetHash).toBe("a".repeat(64));
    expect(summarizeLineage(result.lineage).datasetHash).toBe("a".repeat(64));
  });

  it("unions records and sources across a join", () => {
    const result = fromRecords("acquisitions", [
      { id: "d1", targetId: "c1", dealValue: 10, sources: ["deal source"] },
    ])
      .join("companies", "company", companies, (deal) => deal.targetId)
      .estimate("sector.moic.median");

    expect(result.lineage.inputs).toEqual([
      { table: "acquisitions", id: "d1" },
    ]);
    expect(result.lineage.supporting).toEqual([
      { table: "companies", id: "c1" },
    ]);
    expect(result.lineage.sources).toEqual(
      expect.arrayContaining([
        { kind: "prose", rawCitation: "deal source" },
        { kind: "prose", rawCitation: "company source" },
      ]),
    );
  });

  it("exposes the explicit joined relation and excludes unmatched sources", () => {
    const joined = fromRecords("acquisitions", [
      { id: "d1", targetId: "c1", dealValue: 10 },
      { id: "d2", targetId: "missing", dealValue: 20 },
    ]).join("companies", "company", companies, (deal) => deal.targetId);

    expect(joined.records[0].value.company.id).toBe("c1");
    expect(joined.sources).toEqual([
      { kind: "prose", rawCitation: "company source" },
    ]);
    expect(joined.sources).not.toContainEqual({
      kind: "prose",
      rawCitation: "shared source",
    });
  });

  it("derives supporting records from surviving rows", () => {
    const result = fromRecords("acquisitions", [
      { id: "d1", targetId: "c1", dealValue: 10 },
      { id: "d2", targetId: "c2", dealValue: 20 },
    ])
      .join("companies", "company", companies, (deal) => deal.targetId)
      .exclude((deal) => deal.id === "d2", "out_of_scope")
      .map((deal) => deal.dealValue!)
      .estimate("sector.moic.median");

    expect(result.lineage.n).toBe(1);
    expect(result.lineage.supporting).toEqual([
      { table: "companies", id: "c1" },
    ]);
  });

  it("records unmatched join rows as exclusions", () => {
    const collection = fromRecords("acquisitions", [
      { id: "d1", targetId: "missing", dealValue: 10 },
    ]).join("companies", "company", companies, (deal) => deal.targetId);

    expect(collection.n).toBe(0);
    expect(collection.excluded).toEqual([
      {
        ref: { table: "acquisitions", id: "d1" },
        reason: "unmatched_join:companies",
        field: "company",
        evaluatedCount: 1,
      },
    ]);
  });

  it("accumulates exclusion reasons and derives missingness", () => {
    const collection = fromRecords("acquisitions", [
      { id: "d1", dealValue: 10 },
      { id: "d2" },
      { id: "d3" },
    ])
      .exclude((deal) => deal.id === "d2", "value_undisclosed", "dealValue")
      .exclude(
        (deal) => deal.id === "d3",
        "funding_unresearched",
        "totalFunding",
      );

    expect(collection.n).toBe(1);
    expect(collection.excluded).toHaveLength(2);
    expect(collection.missingness).toEqual([
      { field: "dealValue", missing: 1, total: 3 },
      { field: "totalFunding", missing: 1, total: 2 },
    ]);
  });

  it("does not classify unfielded exclusions as missingness", () => {
    const collection = fromRecords("acquisitions", [
      { id: "d1", dealValue: 10 },
    ]).exclude(() => true, "out_of_scope");

    expect(collection.excluded).toHaveLength(1);
    expect(collection.missingness).toEqual([]);
  });

  it("suppresses below minN and estimates above it", () => {
    const small = fromRecords("acquisitions", [
      { id: "d1", dealValue: 1 },
      { id: "d2", dealValue: 2 },
    ])
      .map((deal) => deal.dealValue!)
      .estimate("sector.moic.median");
    expect(small.kind).toBe("insufficient");
    expect(small.lineage.suppression).toBe("n<5");

    const large = fromRecords(
      "acquisitions",
      Array.from({ length: 5 }, (_, index) => ({
        id: `d${index}`,
        dealValue: index + 1,
      })),
    )
      .map((deal) => deal.dealValue!)
      .estimate("sector.moic.median");
    expect(large.kind).toBe("sufficient");
    expect(large.sampleSize).toBe(5);
  });

  it("summarizes withheld lineage without record-level references", () => {
    const estimate = fromRecords("acquisitions", [
      { id: "d1", dealValue: 1 },
      { id: "d2", dealValue: 2 },
    ])
      .exclude((deal) => deal.id === "d1", "value_undisclosed", "dealValue")
      .map((deal) => deal.dealValue!)
      .estimate("sector.moic.median");

    const summary = summarizeLineage(estimate.lineage);
    expect(summary).toEqual(expect.objectContaining({
      n: 1,
      originalInputCount: 2,
      excluded: [{ reason: "value_undisclosed", count: 1 }],
      missingness: [{ field: "dealValue", missing: 1, total: 2 }],
    }));
    expect(summary).not.toHaveProperty("inputs");
    expect(summary).not.toHaveProperty("sources");
    expect(summary).not.toHaveProperty("supporting");
  });

  it("fails loudly for an unregistered metric", () => {
    expect(() =>
      fromRecords("acquisitions", [{ id: "d1", dealValue: 1 }])
        .map((deal) => deal.dealValue!)
        .estimate("not.registered")
    ).toThrow("Unregistered lineage metric: not.registered");
  });
});
