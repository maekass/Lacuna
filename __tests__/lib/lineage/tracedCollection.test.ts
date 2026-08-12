import { describe, expect, it } from "vitest";
import { fromRecords } from "@/lib/lineage";

interface Company {
  id: string;
  sources?: string[];
}

const companies: Company[] = [
  { id: "c1", sources: ["company source"] },
  { id: "c2", sources: ["shared source"] },
];

describe("traced lineage collections", () => {
  it("unions records and sources across a join", () => {
    const result = fromRecords("acquisitions", [
      { id: "d1", targetId: "c1", dealValue: 10, sources: ["deal source"] },
    ])
      .join("companies", companies, (deal) => deal.targetId)
      .estimate("sector.moic.median");

    expect(result.lineage.inputs).toEqual([
      { table: "acquisitions", id: "d1" },
      { table: "companies", id: "c1" },
    ]);
    expect(result.lineage.sources).toEqual(
      expect.arrayContaining([
        { kind: "citation", rawCitation: "deal source" },
        { kind: "citation", rawCitation: "company source" },
      ]),
    );
  });

  it("records unmatched join rows as exclusions", () => {
    const collection = fromRecords("acquisitions", [
      { id: "d1", targetId: "missing", dealValue: 10 },
    ]).join("companies", companies, (deal) => deal.targetId);

    expect(collection.n).toBe(0);
    expect(collection.excluded).toEqual([
      {
        ref: { table: "acquisitions", id: "d1" },
        reason: "unmatched_join:companies",
        field: "company",
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
      { field: "totalFunding", missing: 1, total: 3 },
    ]);
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

  it("fails loudly for an unregistered metric", () => {
    expect(() =>
      fromRecords("acquisitions", [{ id: "d1", dealValue: 1 }])
        .map((deal) => deal.dealValue!)
        .estimate("not.registered")
    ).toThrow("Unregistered lineage metric: not.registered");
  });
});
