import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import {
  parseVerifiedDataset,
  verifiedDatasetSchema,
} from "@/lib/data/datasetSchema";
import { parseStaticVerifiedDatasetJson } from "@/lib/data/staticDataset";

const full = parseStaticVerifiedDatasetJson(verifiedJson);

describe("verifiedDatasetSchema", () => {
  it("parses the bundled verified JSON (success)", () => {
    expect(full.companies.length).toBeGreaterThan(0);
    expect(full.acquisitions.length).toBeGreaterThan(0);
    expect(full.provenance.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects explicit null on optional string fields (db/static parity)", () => {
    const cases = [
      {
        label: "company.hq",
        mutate: (d: typeof full) => {
          d.companies[0] = { ...d.companies[0], hq: null as never };
        },
      },
      {
        label: "acquirer.ticker",
        mutate: (d: typeof full) => {
          d.acquirers[0] = { ...d.acquirers[0], ticker: null as never };
        },
      },
      {
        label: "acquisition.dealValueNote",
        mutate: (d: typeof full) => {
          d.acquisitions[0] = {
            ...d.acquisitions[0],
            dealValueNote: null as never,
          };
        },
      },
      {
        label: "acquisition.closedDate",
        mutate: (d: typeof full) => {
          d.acquisitions[0] = {
            ...d.acquisitions[0],
            closedDate: null as never,
          };
        },
      },
    ] as const;

    for (const { label, mutate } of cases) {
      const broken = structuredClone(full);
      mutate(broken);
      const result = verifiedDatasetSchema.safeParse(broken);
      expect(result.success, label).toBe(false);
    }
  });

  it("rejects invalid evidenceClass (error)", () => {
    const broken = structuredClone(full);
    broken.companies[0] = {
      ...broken.companies[0],
      evidenceClass: "not_a_class" as never,
    };
    expect(verifiedDatasetSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects invalid ISO date on acquisition (error)", () => {
    const broken = structuredClone(full);
    broken.acquisitions[0] = {
      ...broken.acquisitions[0],
      announcedDate: "03/15/2024",
    };
    expect(() => parseVerifiedDataset(broken)).toThrow();
  });

  it("allows absent optional fields (success)", () => {
    const minimal = {
      provenance: full.provenance,
      companies: [
        {
          id: "c-test",
          name: "Test Co",
          sector: "Fertility",
          stage: "Private",
        },
      ],
      acquirers: [
        {
          id: "acquirer-test",
          name: "Test Acquirer",
          hq: "Boston, MA",
        },
      ],
      acquisitions: [
        {
          id: "deal-test",
          targetId: "c-test",
          acquirerId: "acquirer-test",
          targetName: "Test Co",
          acquirerName: "Test Acquirer",
          announcedDate: "2024-01-01",
          dealType: "Acquisition",
          source: "https://example.com",
          strategicRationale: "Test rationale for schema coverage.",
        },
      ],
    };
    expect(() => parseVerifiedDataset(minimal)).not.toThrow();
  });
});
