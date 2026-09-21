import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { inferSourceUrl } from "@/lib/deals/inferSourceUrl";

const repoRoot = path.resolve(__dirname, "../../..");
const EDGAR_HOST = "www.sec.gov";
const EDGAR_ARCHIVES_PATH = "/Archives/edgar/";

interface BackfillRecord {
  dealId: string;
  status: string;
  ref?: { url?: string } | null;
}

/** True when source cites an https www.sec.gov /Archives/edgar/ URL. */
function sourceHasEdgarArchivesUrl(source: string): boolean {
  const matches = source.match(/https?:\/\/[^\s;]+/gi) ?? [];
  for (const raw of matches) {
    try {
      const url = new URL(raw);
      if (
        url.protocol === "https:" &&
        url.hostname === EDGAR_HOST &&
        url.pathname.startsWith(EDGAR_ARCHIVES_PATH)
      ) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

describe("applied SEC source backfill", () => {
  const dataset = getStaticVerifiedDataset();
  const backfill = JSON.parse(
    readFileSync(
      path.join(repoRoot, "staging/source-backfill/results.json"),
      "utf8",
    ),
  ) as { records: BackfillRecord[] };

  it("appends identity-checked accession URLs and leaves EFTS rejects descriptive (success)", () => {
    const accepted = backfill.records.filter((r) =>
      r.status === "accepted" && r.ref?.url
    );
    expect(accepted).toHaveLength(19);

    for (const record of accepted) {
      const deal = dataset.acquisitions.find((d) => d.id === record.dealId);
      expect(deal, record.dealId).toBeDefined();
      expect(deal!.source).toContain(record.ref!.url!);
    }

    const rejectedWithoutUrl = backfill.records.filter((r) =>
      r.status !== "accepted"
    );
    for (const record of rejectedWithoutUrl) {
      const deal = dataset.acquisitions.find((d) => d.id === record.dealId);
      if (!deal) continue;
      expect(deal.source).not.toMatch(/https?:\/\/www\.sec\.gov\/Archives\//);
    }

    const withArchives = dataset.acquisitions.filter((d) =>
      sourceHasEdgarArchivesUrl(d.source)
    );
    expect(withArchives).toHaveLength(19);
  });

  it("exposes accession or ticker-locator URLs on the evidence ladder, not invented press URLs (success)", () => {
    const livongo = dataset.acquisitions.find((d) => d.id === "deal1");
    expect(sourceHasEdgarArchivesUrl(livongo?.source ?? "")).toBe(true);
    expect(livongo?.announcedDate).toBe("2020-08-05");

    const hologic = dataset.acquirers.find((a) =>
      dataset.acquisitions.find((d) => d.id === "deal7")?.acquirerId === a.id
    );
    const deal7Citation = dataset.acquisitions.find((d) => d.id === "deal7")
      ?.source ?? "";
    expect(deal7Citation).toMatch(/8-K/);
    expect(sourceHasEdgarArchivesUrl(deal7Citation)).toBe(false);
    const locator = inferSourceUrl(
      deal7Citation.split(";")[0] ?? "",
      hologic?.ticker,
    );
    expect(locator).toContain("browse-edgar");
    expect(locator).toContain(hologic?.ticker ?? "HOLX");
  });

  it("keeps portfolio Diagnostic distinct from acquired Diagnostics (success)", () => {
    const portfolio = dataset.companies.filter((c) =>
      c.sector === "Diagnostic (portfolio)"
    );
    const leftover = dataset.companies.filter((c) => c.sector === "Diagnostic");
    const diagnostics = dataset.companies.filter((c) =>
      c.sector === "Diagnostics"
    );
    expect(leftover).toHaveLength(0);
    expect(portfolio).toHaveLength(7);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(
      dataset.acquisitions.some((d) =>
        portfolio.some((c) => c.id === d.targetId)
      ),
    ).toBe(false);
  });
});
