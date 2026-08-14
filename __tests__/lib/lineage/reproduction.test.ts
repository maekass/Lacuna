import { describe, expect, it } from "vitest";
import { parseVerifiedDataset } from "@/lib/data/datasetSchema";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import {
  assertDatasetCrossCheckAvailable,
  assertDatasetHashMatches,
  assertDatasetReproductionMatches,
  createReproductionArtifact,
  fromRecords,
  reproduceArtifact,
  reproduceFromDataset,
} from "@/lib/lineage";
import { buildValuationMatrixEstimate } from "@/lib/valuation/valuationMatrix";

const records = [
  { id: "c1", lastKnownValuation: 10 },
  { id: "c2", lastKnownValuation: 20 },
  { id: "c3", lastKnownValuation: 30 },
  { id: "c4", lastKnownValuation: 40 },
  { id: "c5", lastKnownValuation: 50 },
];

function artifact() {
  const estimate = fromRecords("companies", records, {
    datasetVersion: "v8",
    datasetHash: "a".repeat(64),
    computedAt: "2026-01-01T00:00:00.000Z",
  }).map(
    (company) => company.lastKnownValuation,
    ({ input, ref }) => [{
      ref,
      field: "lastKnownValuation",
      value: input.lastKnownValuation,
    }],
  ).estimate("valuation.matrix.median");
  return createReproductionArtifact(estimate, estimate.lineage);
}

describe("metric reproduction artifacts", () => {
  it("round-trips a measured metric and preserves contributors", () => {
    const exported = artifact();
    const actual = reproduceArtifact(exported);

    expect(actual).toEqual({
      kind: "sufficient",
      value: 30,
      sampleSize: 5,
      disclosedFraction: 1,
      confidenceInterval: expect.any(Array),
      selectionCaveat: expect.any(String),
    });
    expect(exported.contributors).toEqual([
      {
        ref: { table: "companies", id: "c1" },
        value: 10,
        reads: [{
          ref: { table: "companies", id: "c1" },
          field: "lastKnownValuation",
          value: 10,
        }],
      },
      {
        ref: { table: "companies", id: "c2" },
        value: 20,
        reads: [{
          ref: { table: "companies", id: "c2" },
          field: "lastKnownValuation",
          value: 20,
        }],
      },
      {
        ref: { table: "companies", id: "c3" },
        value: 30,
        reads: [{
          ref: { table: "companies", id: "c3" },
          field: "lastKnownValuation",
          value: 30,
        }],
      },
      {
        ref: { table: "companies", id: "c4" },
        value: 40,
        reads: [{
          ref: { table: "companies", id: "c4" },
          field: "lastKnownValuation",
          value: 40,
        }],
      },
      {
        ref: { table: "companies", id: "c5" },
        value: 50,
        reads: [{
          ref: { table: "companies", id: "c5" },
          field: "lastKnownValuation",
          value: 50,
        }],
      },
    ]);
  });

  it("detects tampered expected and contributor values", () => {
    const exported = artifact();
    const expected = {
      ...exported,
      expected: {
        ...exported.expected,
        value: 31,
      },
    };
    const contributor = {
      ...exported,
      contributors: exported.contributors.map((entry, index) =>
        index === 0 ? { ...entry, value: 11 } : entry
      ),
    };

    expect(reproduceArtifact(expected).kind).toBe("sufficient");
    expect(reproduceArtifact(contributor)).not.toEqual(
      reproduceArtifact(exported),
    );
    expect(expected.expected).not.toEqual(reproduceArtifact(expected));
  });

  it("reproduces withholding decisions", () => {
    const estimate = fromRecords(
      "companies",
      records.slice(0, 2),
      { computedAt: "2026-01-01T00:00:00.000Z" },
    ).map((company) => company.lastKnownValuation)
      .estimate("valuation.matrix.median");
    const exported = createReproductionArtifact(estimate, estimate.lineage);

    expect(exported.expected.kind).toBe("insufficient");
    expect(reproduceArtifact(exported)).toMatchObject({
      kind: "insufficient",
      sampleSize: estimate.sampleSize,
      minRequired: estimate.minRequired,
    });
  });

  it("is byte-stable for a fixed computedAt", () => {
    expect(JSON.stringify(artifact(), null, 2)).toBe(
      JSON.stringify(artifact(), null, 2),
    );
  });

  it("rejects an export from a different dataset state", () => {
    expect(() => assertDatasetHashMatches("a".repeat(64), "b".repeat(64)))
      .toThrow(
        "Dataset state mismatch: export records " +
          `${"a".repeat(64)}, but the current dataset is ${"b".repeat(64)}.`,
      );
  });

  it("refuses dataset cross-checks without traced reads", () => {
    const estimate = fromRecords("companies", records, {
      datasetHash: "a".repeat(64),
      computedAt: "2026-01-01T00:00:00.000Z",
    }).map((company) => company.lastKnownValuation)
      .estimate("valuation.matrix.median");
    const exported = createReproductionArtifact(estimate, estimate.lineage);

    expect(() =>
      assertDatasetCrossCheckAvailable(
        exported.contributors,
        exported.metricId,
      )
    ).toThrow(
      "Dataset cross-check unavailable for metric valuation.matrix.median",
    );
  });

  it("rejects a consistently scaled forgery during dataset recomputation", () => {
    const dataset = parseVerifiedDataset({
      provenance: {
        lastUpdated: "2026-01-01",
        datasetVersion: "v8",
        sources: [],
        notes: [],
        purpose: "test",
        disclaimer: "test",
      },
      companies: [
        {
          id: "c1",
          name: "One",
          sector: "Breast Health",
          stage: "Acquired",
          lastKnownValuation: 10,
          sources: [],
        },
        {
          id: "c2",
          name: "Two",
          sector: "Breast Health",
          stage: "Acquired",
          lastKnownValuation: 20,
          sources: [],
        },
        {
          id: "c3",
          name: "Three",
          sector: "Breast Health",
          stage: "Acquired",
          lastKnownValuation: 30,
          sources: [],
        },
        {
          id: "c4",
          name: "Four",
          sector: "Breast Health",
          stage: "Acquired",
          lastKnownValuation: 40,
          sources: [],
        },
        {
          id: "c5",
          name: "Five",
          sector: "Breast Health",
          stage: "Acquired",
          lastKnownValuation: 50,
          sources: [],
        },
      ],
      acquirers: [],
      acquisitions: [],
    });
    const estimate = buildValuationMatrixEstimate(
      buildVerifiedDerivedData(dataset).verifiedCompanies,
      "Breast Health",
      "Acquired",
      {
        reproductionParameters: { sector: "Breast Health", stage: "Acquired" },
      },
    ).estimate;
    const exported = createReproductionArtifact(estimate, estimate.lineage);
    const forged = {
      ...exported,
      expected: exported.expected.kind === "sufficient"
        ? {
          ...exported.expected,
          value: exported.expected.value * 2,
          confidenceInterval: exported.expected.confidenceInterval.map(
            (value) => value * 2,
          ) as readonly [number, number],
        }
        : exported.expected,
      contributors: exported.contributors.map((contributor) => ({
        ...contributor,
        value: contributor.value * 2,
      })),
    };
    const recomputed = reproduceFromDataset(
      forged.metricId,
      dataset,
      forged.reproductionParameters,
    );
    expect(recomputed).not.toBeUndefined();
    expect(() => assertDatasetReproductionMatches(forged, recomputed!)).toThrow(
      "Dataset recomputation mismatch",
    );
  });

  it("does not claim a vacuous withheld cross-check passed", () => {
    const estimate = fromRecords(
      "companies",
      records.slice(0, 2),
      { computedAt: "2026-01-01T00:00:00.000Z" },
    ).map((company) => company.lastKnownValuation)
      .estimate("valuation.matrix.median");
    const exported = {
      ...createReproductionArtifact(estimate, estimate.lineage),
      contributors: [],
    };
    expect(exported.contributors).toHaveLength(0);
    expect(() =>
      assertDatasetCrossCheckAvailable(
        exported.contributors,
        exported.metricId,
      )
    ).toThrow("cross-check unavailable");
  });
});
