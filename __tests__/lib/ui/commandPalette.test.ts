import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { FEATURED_DEAL_ID } from "@/lib/deals/dealTypes";
import {
  buildCommandItems,
  commandDealsFromDataset,
  filterCommandItems,
} from "@/lib/ui/commandPalette";

describe("command palette index", () => {
  const deals = commandDealsFromDataset(getStaticVerifiedDataset());
  const items = buildCommandItems(deals);

  it("indexes the featured verified deal with its sector", () => {
    const featured = deals.find((deal) => deal.id === FEATURED_DEAL_ID);
    expect(featured?.targetName).toBe("Biotheranostics");
    expect(featured?.sector).toBe("Breast Health");
    const match = filterCommandItems(items, "biotheranostics");
    expect(match[0]?.href).toBe(`/deals/${FEATURED_DEAL_ID}`);
    expect(match[0]?.group).toBe("Deal");
  });

  it("shows workspaces before a query and sections once the query matches", () => {
    const initial = filterCommandItems(items, "");
    expect(initial.every((item) => item.group === "Workspace")).toBe(true);
    expect(initial.some((item) => item.href === "/deals")).toBe(true);
    expect(initial.some((item) => item.group === "Deal")).toBe(false);

    const section = filterCommandItems(items, "network");
    expect(section.some((item) => item.href === "/deals#network")).toBe(true);
  });

  it("prefers a label prefix over a keyword buried in the detail", () => {
    const match = filterCommandItems(items, "hologic");
    expect(
      match[0]?.label.toLowerCase().includes("hologic") ||
        match[0]?.detail.toLowerCase().includes("hologic"),
    ).toBe(true);
    expect(match.length).toBeGreaterThan(0);
    expect(match.length).toBeLessThanOrEqual(12);
  });
});
