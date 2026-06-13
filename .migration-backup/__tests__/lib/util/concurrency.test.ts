import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/lib/util/concurrency";

describe("mapWithConcurrency", () => {
  it("maps all items with concurrency cap (success)", async () => {
    const order: number[] = [];
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      order.push(n);
      return n * 2;
    });
    expect(results).toEqual([2, 4, 6, 8]);
    expect(order.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});
