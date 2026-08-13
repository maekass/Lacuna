import { createHash } from "node:crypto";

const RECORD_ARRAY_KEYS = new Set([
  "companies",
  "acquirers",
  "acquisitions",
]);

export interface DatasetIdentity {
  readonly fullHash: string;
  readonly shortHash: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeValue(value: unknown, path: readonly string[]): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeValue(item, path));
    if (RECORD_ARRAY_KEYS.has(path[path.length - 1] ?? "")) {
      return items.sort((left, right) => {
        if (!isObject(left) || !isObject(right)) return 0;
        return String(left.id ?? "").localeCompare(String(right.id ?? ""));
      });
    }
    return items;
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !(path[0] === "provenance" && key === "datasetHash"))
        .sort()
        .map((key) => [
          key,
          canonicalizeValue(value[key], [...path, key]),
        ]),
    );
  }
  return value;
}

/** Return the stable JSON representation used for dataset identity. */
export function canonicalizeDataset(dataset: unknown): string {
  return JSON.stringify(canonicalizeValue(dataset, []));
}

/**
 * Hash the full parsed dataset document, including provenance metadata.
 *
 * The attached hash field is excluded to avoid making the identity
 * self-referential; all other normalized metadata and records are covered.
 */
export function hashDataset(dataset: unknown): DatasetIdentity {
  const canonical = canonicalizeDataset(dataset);
  const fullHash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return {
    fullHash,
    shortHash: fullHash.slice(0, 12),
  };
}
