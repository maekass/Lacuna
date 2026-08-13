import { beforeEach, describe, expect, it, vi } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import { hashDataset } from "@/lib/lineage/datasetHash";

vi.mock("@/lib/data/loadVerifiedDatasetFromDb", () => ({
  loadVerifiedDatasetFromDb: vi.fn(),
}));

describe("datasetProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getDataMode returns static by default (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "");
    const { getDataMode } = await import("@/lib/data/datasetProvider");
    expect(getDataMode()).toBe("static");
  });

  it("getDataMode returns db when env set (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "db");
    const { getDataMode } = await import("@/lib/data/datasetProvider");
    expect(getDataMode()).toBe("db");
  });

  it("getVerifiedDataset returns static JSON in static mode (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "static");
    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    const dataset = await getVerifiedDataset();
    expect(dataset.companies.length).toBeGreaterThan(0);
    expect(dataset.provenance.disclaimer.toLowerCase()).toContain(
      "educational",
    );
  });

  it("getVerifiedDataset loads from DB in db mode (success)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "db");
    const { loadVerifiedDatasetFromDb } = await import(
      "@/lib/data/loadVerifiedDatasetFromDb"
    );
    vi.mocked(loadVerifiedDatasetFromDb).mockResolvedValue(
      minimalVerifiedDataset,
    );

    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    const dataset = await getVerifiedDataset();

    expect(loadVerifiedDatasetFromDb).toHaveBeenCalledOnce();
    expect(dataset).toEqual({
      ...minimalVerifiedDataset,
      provenance: {
        ...minimalVerifiedDataset.provenance,
        datasetHash: hashDataset(minimalVerifiedDataset).fullHash,
      },
    });
  });

  it("getVerifiedDataset propagates DB loader errors (error)", async () => {
    vi.stubEnv("LACUNA_DATA_MODE", "db");
    const { loadVerifiedDatasetFromDb } = await import(
      "@/lib/data/loadVerifiedDatasetFromDb"
    );
    vi.mocked(loadVerifiedDatasetFromDb).mockRejectedValue(
      new Error("connection refused"),
    );

    const { getVerifiedDataset } = await import("@/lib/data/datasetProvider");
    await expect(getVerifiedDataset()).rejects.toThrow("connection refused");
  });
});

describe("getStaticVerifiedDataset", () => {
  it("returns the bundled verified JSON (success)", async () => {
    const { getStaticVerifiedDataset } = await import(
      "@/lib/data/staticDataset"
    );
    const dataset = getStaticVerifiedDataset();
    expect(dataset.acquisitions.length).toBeGreaterThan(0);
  });

  it("includes provenance disclaimer from verified JSON (edge)", async () => {
    const { getStaticVerifiedDataset } = await import(
      "@/lib/data/staticDataset"
    );
    const dataset = getStaticVerifiedDataset();
    expect(dataset.provenance.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dataset.provenance.disclaimer.length).toBeGreaterThan(10);
  });
});
