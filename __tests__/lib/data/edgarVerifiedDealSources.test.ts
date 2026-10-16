import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import { parseStaticVerifiedDatasetJson } from "@/lib/data/staticDataset";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";

const full = parseStaticVerifiedDatasetJson(verifiedJson);
const byId = new Map(full.acquisitions.map((d) => [d.id, d]));

const EDGAR_CITED_DEALS = [
  "deal4",
  "deal7",
  "deal20",
  "deal24",
  "deal25",
  "deal32",
  "deal38",
  "deal43",
  "deal51",
] as const;

describe("SEC EDGAR-cited deal sources", () => {
  it.each(EDGAR_CITED_DEALS)("%s cites an EDGAR archive URL", (id) => {
    expect(byId.get(id)?.source).toMatch(
      /https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\//,
    );
  });

  it("no EDGAR-cited deal is flagged as non-resolvable", () => {
    const flagged = new Set(
      validateVerifiedDataset(full).warnings
        .filter((w) => w.code === "deal.nonResolvableSource")
        .map((w) => w.entity),
    );
    expect(EDGAR_CITED_DEALS.filter((id) => flagged.has(id))).toEqual([]);
  });

  it("dates Cogentix/Laborie closing to the Apr 23, 2018 consummation 8-K", () => {
    expect(byId.get("deal32")?.closedDate).toBe("2018-04-23");
  });

  it("dates TherapeuticsMD/Mayne to the Dec 4, 2022 agreement and Dec 30, 2022 close", () => {
    const deal = byId.get("deal38");
    expect(deal?.announcedDate).toBe("2022-12-04");
    expect(deal?.closedDate).toBe("2022-12-30");
  });
});
