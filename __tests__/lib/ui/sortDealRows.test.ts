import { describe, expect, it } from "vitest";
import type { ComparableDealSummary } from "@/lib/deals/dealTypes";
import {
  filterDealRows,
  sortDealRows,
  toggleDealSort,
} from "@/lib/ui/sortDealRows";

function row(
  partial:
    & Pick<ComparableDealSummary, "id" | "targetName">
    & Partial<ComparableDealSummary>,
): ComparableDealSummary {
  return {
    acquirerName: "Acquirer",
    announcedDate: "2020-01-01",
    announcedLabel: "Jan 2020",
    dealType: "acquisition",
    sector: "Breast Health",
    ...partial,
  };
}

const rows = [
  row({
    id: "a",
    targetName: "Cedar",
    acquirerName: "Hologic",
    announcedDate: "2019-06-01",
    announcedLabel: "Jun 2019",
    dealValue: 50,
  }),
  row({
    id: "b",
    targetName: "Alder",
    acquirerName: "Abbott",
    announcedDate: "2021-03-01",
    announcedLabel: "Mar 2021",
    dealValue: 200,
  }),
  row({
    id: "c",
    targetName: "Birch",
    announcedDate: "2020-01-01",
  }),
];

describe("sortDealRows", () => {
  it("sorts targets A to Z, then flips", () => {
    const asc = sortDealRows(rows, toggleDealSort(null, "target"));
    expect(asc.map((item) => item.targetName)).toEqual([
      "Alder",
      "Birch",
      "Cedar",
    ]);
    const desc = sortDealRows(
      rows,
      toggleDealSort(
        { key: "target", direction: "asc" },
        "target",
      ),
    );
    expect(desc.map((item) => item.targetName)).toEqual([
      "Cedar",
      "Birch",
      "Alder",
    ]);
  });

  it("keeps undisclosed values after disclosed values in both directions", () => {
    const highFirst = sortDealRows(rows, { key: "value", direction: "desc" });
    const lowFirst = sortDealRows(rows, { key: "value", direction: "asc" });
    expect(highFirst.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(lowFirst.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("filters on acquirer and sector without dropping the source list", () => {
    expect(filterDealRows(rows, "hologic").map((item) => item.id)).toEqual([
      "a",
    ]);
    expect(filterDealRows(rows, "breast").map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(filterDealRows(rows, "   ")).toHaveLength(3);
  });
});
