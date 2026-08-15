import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { canonicalizeDataset, hashDataset } from "@/lib/lineage/datasetHash";
import summary from "@/data/computed-dataset-summary.json";

describe("dataset identity", () => {
  const dataset = getStaticVerifiedDataset();

  it("hashes the parsed dataset the app uses, not raw JSON bytes", () => {
    expect(hashDataset(dataset).fullHash).toBe(
      summary.provenance.datasetHash,
    );
  });

  it("ignores formatting, object key order, and record order", () => {
    const reordered = {
      acquisitions: [...dataset.acquisitions].reverse(),
      companies: [...dataset.companies].reverse(),
      provenance: Object.fromEntries(
        Object.entries(dataset.provenance).reverse(),
      ),
      acquirers: [...dataset.acquirers].reverse(),
    };

    expect(hashDataset(JSON.parse(JSON.stringify(reordered)))).toEqual(
      hashDataset(dataset),
    );
    expect(canonicalizeDataset(reordered)).toBe(canonicalizeDataset(dataset));
  });

  it("does not change when the attached datasetHash is added", () => {
    const withHash = {
      ...dataset,
      provenance: {
        ...dataset.provenance,
        datasetHash: hashDataset(dataset).fullHash,
      },
    };

    expect(hashDataset(withHash).fullHash).toBe(hashDataset(dataset).fullHash);
  });

  it("changes when one dataset field changes", () => {
    const changed = structuredClone(dataset);
    changed.companies[0] = {
      ...changed.companies[0],
      name: `${changed.companies[0].name} changed`,
    };

    expect(hashDataset(changed).fullHash).not.toBe(
      hashDataset(dataset).fullHash,
    );
  });

  it("exposes a readable short digest", () => {
    const identity = hashDataset(dataset);
    expect(identity.fullHash).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.shortHash).toBe(identity.fullHash.slice(0, 12));
  });
});
