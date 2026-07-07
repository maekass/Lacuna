import { describe, expect, it } from "vitest";
import { mapRowsToVerifiedDataset } from "@/lib/data/mapVerifiedDataset";
import {
  sampleAcquirerRow,
  sampleAcquisitionRow,
  sampleCompanyRow,
  sampleProvenanceRow,
} from "../../helpers/fixtures";

describe("mapRowsToVerifiedDataset", () => {
  it("maps full row sets to VerifiedDataset (success)", () => {
    const dataset = mapRowsToVerifiedDataset(
      sampleProvenanceRow,
      [sampleCompanyRow],
      [sampleAcquirerRow],
      [sampleAcquisitionRow],
    );

    expect(dataset.provenance.lastUpdated).toBe(
      sampleProvenanceRow.last_updated instanceof Date
        ? sampleProvenanceRow.last_updated.toISOString().slice(0, 10)
        : String(sampleProvenanceRow.last_updated).slice(0, 10),
    );
    expect(dataset.companies[0].lastKnownValuation).toBe(230);
    expect(dataset.acquirers[0].ticker).toBe("HOLX");
    expect(dataset.acquisitions[0].targetId).toBe("c24");
    expect(dataset.acquisitions[0].dealValue).toBe(230);
  });

  it("handles empty entity arrays (edge)", () => {
    const dataset = mapRowsToVerifiedDataset(sampleProvenanceRow, [], [], []);
    expect(dataset.companies).toEqual([]);
    expect(dataset.acquisitions).toEqual([]);
  });

  it("coerces invalid numeric strings to undefined (edge)", () => {
    const row = {
      ...sampleCompanyRow,
      last_known_valuation: "not-a-number",
      total_funding: "",
    };
    const dataset = mapRowsToVerifiedDataset(
      sampleProvenanceRow,
      [row],
      [],
      [],
    );
    expect(dataset.companies[0].lastKnownValuation).toBeUndefined();
    expect(dataset.companies[0].totalFunding).toBeUndefined();
  });

  it("formats Date and string dates consistently (edge)", () => {
    const withStringDate = {
      ...sampleAcquisitionRow,
      announced_date: "2023-12-05",
      closed_date: "2024-01-01",
    };
    const dataset = mapRowsToVerifiedDataset(
      sampleProvenanceRow,
      [],
      [],
      [withStringDate],
    );
    expect(dataset.acquisitions[0].announcedDate).toBe("2023-12-05");
    expect(dataset.acquisitions[0].closedDate).toBe("2024-01-01");
  });

  it("defaults missing optional arrays on provenance (edge)", () => {
    const dataset = mapRowsToVerifiedDataset(
      {
        ...sampleProvenanceRow,
        sources: undefined as unknown as string[],
        notes: undefined as unknown as string[],
      },
      [],
      [],
      [],
    );
    expect(dataset.provenance.sources).toEqual([]);
    expect(dataset.provenance.notes).toEqual([]);
  });
});
