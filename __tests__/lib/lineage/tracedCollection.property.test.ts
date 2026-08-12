import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { fromRecords } from "@/lib/lineage";

describe("traced lineage collection properties", () => {
  it("is order-independent for record and source accumulation", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^d[0-9]+$/), {
          minLength: 1,
          maxLength: 12,
        }),
        (ids) => {
          const records = ids.map((id) => ({
            id,
            sources: [`source-${id}`],
          }));
          const forward = fromRecords("deals", records);
          const reverse = fromRecords("deals", [...records].reverse());
          const refs = (value: typeof forward) =>
            value.records.map((record) =>
              `${record.ref.table}:${record.ref.id}`
            )
              .sort();
          const sources = (value: typeof forward) =>
            value.sources.map((source) => source.rawCitation).sort();
          expect(refs(forward)).toEqual(refs(reverse));
          expect(sources(forward)).toEqual(sources(reverse));
          return true;
        },
      ),
      { numRuns: 40 },
    );
  });

  it("keeps active n plus exclusions equal to the input count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 20 }),
        (missing) => {
          const records = missing.map((isMissing, index) => ({
            id: `d${index}`,
            value: isMissing ? undefined : index + 1,
          }));
          const collection = fromRecords("deals", records).exclude(
            (record) => record.value === undefined,
            "value_missing",
            "value",
          );
          expect(collection.n + collection.excluded.length).toBe(
            records.length,
          );
          return true;
        },
      ),
      { numRuns: 40 },
    );
  });
});
