import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWikidataSearch, fetchPatentsView } from "@/lib/ingestion/freeApi/clients";
import { downloadFreeApiBundles } from "@/lib/ingestion/freeApi/downloadBundle";
import { readLatestFreeApiExport } from "@/lib/ingestion/freeApi/readLatestExport";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";

const miniDataset: VerifiedDataset = {
  provenance: {
    lastUpdated: "2026-06-01",
    sources: [],
    notes: [],
    purpose: "test",
    disclaimer: "test",
  },
  companies: [
    {
      id: "c1",
      name: "Test Femtech Co",
      sector: "Fertility",
      stage: "Series A",
      founded: 2018,
      hq: "Boston, MA",
      description: "Test",
    },
  ],
  acquirers: [
    {
      id: "a1",
      name: "Public Acquirer Inc",
      ticker: "PUB",
      sector: "Healthcare",
      hq: "New York, NY",
    },
  ],
  acquisitions: [],
};

describe("freeApi clients", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PATENTSVIEW_API_KEY;
  });

  it("parses Wikidata search JSON (success)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          search: [{ id: "Q123", label: "Test Femtech Co" }],
        }),
      }),
    );

    const result = await fetchWikidataSearch("Test Femtech Co");
    expect(result.ok).toBe(true);
    expect(result.source).toBe("wikidata");
    expect((result.data as { search: unknown[] }).search).toHaveLength(1);
  });

  it("skips PatentsView without API key (edge)", async () => {
    const result = await fetchPatentsView("Test Femtech Co");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PATENTSVIEW_API_KEY/);
  });
});

describe("downloadFreeApiBundles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads wikidata for each entity (success)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ search: [] }),
      }),
    );

    const { manifest, records } = await downloadFreeApiBundles(miniDataset, {
      datasetPath: "test.json",
      sources: ["wikidata"],
    });

    expect(manifest.entityCount).toBe(2);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.sources.length === 1)).toBe(true);
    expect(records[0].sources[0].ok).toBe(true);
  });
});

describe("readLatestFreeApiExport", () => {
  const exportsRoot = join(process.cwd(), "data/exports/free-apis");
  const older = join(exportsRoot, "2099-01-01T00-00-00.000Z-test");
  const newer = join(exportsRoot, "2099-01-02T00-00-00.000Z-test");

  afterEach(() => {
    for (const dir of [older, newer]) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("returns newest manifest when export folders exist", () => {
    for (const dir of [older, newer]) {
      mkdirSync(join(dir, "entities"), { recursive: true });
      writeFileSync(
        join(dir, "manifest.json"),
        JSON.stringify({
          downloadedAt: dir === newer ? "2099-01-02T12:00:00.000Z" : "2099-01-01T12:00:00.000Z",
          entityCount: 2,
          sourcesRequested: ["wikidata"],
          secUserAgentConfigured: true,
          patentsViewConfigured: false,
          notes: [],
        }),
      );
      writeFileSync(join(dir, "entities", "c1.json"), "{}");
    }

    const latest = readLatestFreeApiExport();
    expect(latest?.manifest.downloadedAt).toBe("2099-01-02T12:00:00.000Z");
    expect(latest?.entityFileCount).toBe(1);
  });
});
