import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { DatasetSliceResult } from "@/lib/data/sliceVerifiedDataset";
import {
  toDbComparableAcquirer,
  toDbComparableAcquisition,
  toDbComparableCompany,
  toDbComparableProvenance,
} from "@/lib/data/datasetSchema";
import {
  getVerifiedDataset,
  getVerifiedDatasetPage,
} from "@/lib/data/datasetProvider";
import {
  type SeededPgMem,
  seedVerifiedPgMem,
} from "../../helpers/seedVerifiedPgMem";

function toDbComparableSlice(slice: DatasetSliceResult): DatasetSliceResult {
  return {
    provenance: toDbComparableProvenance(slice.provenance),
    companies: slice.companies.map(toDbComparableCompany),
    acquirers: slice.acquirers.map(toDbComparableAcquirer),
    acquisitions: slice.acquisitions.map(toDbComparableAcquisition),
    meta: slice.meta,
  };
}

const PAGE_CASES = [
  {
    name: "all resources default page",
    request: { resource: "all" as const, limit: 25, offset: 0 },
  },
  {
    name: "companies only",
    request: { resource: "companies" as const, limit: 10, offset: 5 },
  },
  {
    name: "acquisitions only",
    request: { resource: "acquisitions" as const, limit: 15, offset: 3 },
  },
  {
    name: "acquirers only",
    request: { resource: "acquirers" as const, limit: 8, offset: 2 },
  },
  {
    name: "offset past end",
    request: { resource: "companies" as const, limit: 10, offset: 9999 },
  },
  {
    name: "limit zero",
    request: { resource: "acquisitions" as const, limit: 0, offset: 0 },
  },
  {
    name: "sector filter with no matches",
    request: {
      resource: "all" as const,
      limit: 50,
      offset: 0,
      sector: "__no_such_sector__",
    },
  },
] as const;

function toDbComparableFullDataset(
  dataset: Awaited<ReturnType<typeof getVerifiedDataset>>,
) {
  const sortById = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const sortAcquisitions = (
    rows: Awaited<ReturnType<typeof getVerifiedDataset>>["acquisitions"],
  ) =>
    [...rows].sort((a, b) => {
      const dateCmp = b.announcedDate.localeCompare(a.announcedDate);
      return dateCmp !== 0 ? dateCmp : a.id.localeCompare(b.id);
    });

  return {
    provenance: toDbComparableProvenance(dataset.provenance),
    companies: sortById(dataset.companies).map(toDbComparableCompany),
    acquirers: sortById(dataset.acquirers).map(toDbComparableAcquirer),
    acquisitions: sortAcquisitions(dataset.acquisitions).map(
      toDbComparableAcquisition,
    ),
  };
}

describe("static vs db parity", () => {
  let seeded: SeededPgMem;

  beforeAll(async () => {
    seeded = await seedVerifiedPgMem();
  });

  afterAll(async () => {
    await seeded.teardown();
  });

  it("full dataset load is deeply equal on db-backed fields", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    const staticComparable = toDbComparableFullDataset(
      await getVerifiedDataset(),
    );

    vi.stubEnv("LACUNA_DATA_MODE", "db");
    const dbComparable = toDbComparableFullDataset(await getVerifiedDataset());

    expect(dbComparable).toEqual(staticComparable);
  });

  it.each(PAGE_CASES)(
    "getVerifiedDatasetPage — $name",
    async ({ request }) => {
      vi.stubEnv("LACUNA_DATA_MODE", "static");
      const staticSlice = toDbComparableSlice(
        await getVerifiedDatasetPage(request),
      );

      vi.stubEnv("LACUNA_DATA_MODE", "db");
      const dbSlice = await getVerifiedDatasetPage(request);

      expect(toDbComparableSlice(dbSlice)).toEqual(staticSlice);
    },
  );
});

describe("parseVerifiedDataset rejects null optional fields", () => {
  it("rejects null ticker on acquirer (db/static parity guard)", async () => {
    const { parseVerifiedDataset, verifiedDatasetSchema } = await import(
      "@/lib/data/datasetSchema"
    );
    const { getStaticVerifiedDataset } = await import(
      "@/lib/data/staticDataset"
    );
    const base = getStaticVerifiedDataset();
    const broken = structuredClone(base);
    broken.acquirers[0] = { ...broken.acquirers[0], ticker: null as never };

    expect(() => parseVerifiedDataset(broken)).toThrow();
    expect(verifiedDatasetSchema.safeParse(broken).success).toBe(false);
  });
});
