import { describe, expect, it } from "vitest";
import verifiedDataset from "@/data/dataset.verified.json";
import { canonicalizeDataset, hashDataset } from "@/lib/lineage/datasetHash";

describe("dataset identity", () => {
  it("ignores formatting, object key order, and record order", () => {
    const reordered = {
      acquisitions: [...verifiedDataset.acquisitions].reverse(),
      companies: [...verifiedDataset.companies].reverse(),
      provenance: Object.fromEntries(
        Object.entries(verifiedDataset.provenance).reverse(),
      ),
      acquirers: [...verifiedDataset.acquirers].reverse(),
    };

    expect(hashDataset(JSON.parse(JSON.stringify(reordered)))).toEqual(
      hashDataset(verifiedDataset),
    );
    expect(canonicalizeDataset(reordered)).toBe(
      canonicalizeDataset(verifiedDataset),
    );
  });

  it("changes when one dataset field changes", () => {
    const changed = structuredClone(verifiedDataset);
    changed.companies[0] = {
      ...changed.companies[0],
      name: `${changed.companies[0].name} changed`,
    };

    expect(hashDataset(changed).fullHash).not.toBe(
      hashDataset(verifiedDataset).fullHash,
    );
  });

  it("exposes a readable short digest", () => {
    const identity = hashDataset(verifiedDataset);
    expect(identity.fullHash).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.shortHash).toBe(identity.fullHash.slice(0, 12));
  });
});
