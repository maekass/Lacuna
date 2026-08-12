import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET as getMetric } from "@/app/api/metrics/[metricId]/route";
import { fromRecords } from "@/lib/lineage";

describe("sector-stage evidence metrics", () => {
  const companies = [
    {
      id: "c1",
      sector: "Fertility",
      stage: "Series A",
      lastKnownValuation: 10,
    },
    {
      id: "c2",
      sector: "Fertility",
      stage: "Series A",
      lastKnownValuation: 20,
    },
    {
      id: "c3",
      sector: "Fertility",
      stage: "Series A",
      lastKnownValuation: 30,
    },
    {
      id: "c4",
      sector: "Fertility",
      stage: "Series A",
      lastKnownValuation: 40,
    },
    {
      id: "c5",
      sector: "Fertility",
      stage: "Series A",
      lastKnownValuation: 50,
    },
    { id: "c6", sector: "Fertility", stage: "Seed", lastKnownValuation: 60 },
  ];

  it("withholds below the registry floor", () => {
    const result = fromRecords("companies", companies.slice(0, 4))
      .map((company) => company.lastKnownValuation)
      .estimate("valuation.matrix.median");
    expect(result.kind).toBe("insufficient");
    expect(result.sampleSize).toBe(4);
    expect(result.lineage.suppression).toBe("n<5");
  });

  it("publishes above the floor with exact contributing inputs", () => {
    const result = fromRecords("companies", companies)
      .exclude(
        (company) => company.stage !== "Series A",
        "out_of_stage",
        "stage",
      )
      .map((company) => company.lastKnownValuation as number)
      .estimate("valuation.matrix.median");
    expect(result.kind).toBe("sufficient");
    expect(result.lineage.inputs).toEqual([
      { table: "companies", id: "c1" },
      { table: "companies", id: "c2" },
      { table: "companies", id: "c3" },
      { table: "companies", id: "c4" },
      { table: "companies", id: "c5" },
    ]);
  });
});

describe("slim artifacts", () => {
  it("contain no record-level references", () => {
    const text = readFileSync(
      "src/data/computed-acquirer-premiums.slim.json",
      "utf8",
    );
    expect(text).not.toContain('"lineage"');
    expect(text).not.toContain('"inputs"');
    expect(text).not.toContain('"supporting"');
    expect(text).not.toContain('"sources"');
  });
});

describe("metric lineage API", () => {
  it("returns full lineage for a published metric", async () => {
    const response = await getMetric(new Request("http://localhost"), {
      params: Promise.resolve({
        metricId: "acquirer.premium.preDealValuation",
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.estimate.lineage.inputs.length).toBeGreaterThan(0);
  });

  it("returns a summary for a withheld metric", async () => {
    const response = await getMetric(new Request("http://localhost"), {
      params: Promise.resolve({ metricId: "sector.moic.p25" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.lineage.inputs).toBeUndefined();
    expect(body.lineage.excluded.length).toBeGreaterThan(0);
  });
});
