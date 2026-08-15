import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatDisclosedBillions,
  liveDisclosedStats,
} from "@/lib/data/lacunaDataset";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

/**
 * Pins docs/LIMITATIONS.md headline figures to liveDisclosedStats().
 * Prevents the honesty document from drifting silently (e.g. 20× stale claims).
 */
describe("LIMITATIONS.md matches live lacunaDataset figures", () => {
  it("pins WH total, adjacency exclusion, and SEC share", () => {
    const stats = liveDisclosedStats(getStaticVerifiedDataset());
    const doc = readFileSync(
      path.join(process.cwd(), "docs/LIMITATIONS.md"),
      "utf8",
    );
    const begin = doc.indexOf("<!-- LACUNA_LIVE_STATS_BEGIN -->");
    const end = doc.indexOf("<!-- LACUNA_LIVE_STATS_END -->");
    expect(begin).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(begin);
    const block = doc.slice(begin, end);

    const whMillions = stats.womensHealth.disclosedOnlyTotalMillions;
    const adjMillions = stats.adjacencyExcludedMillions;
    const secPct = (stats.womensHealth.provenanceMix.sec_filing * 100)
      .toFixed(1);
    const pressPct = (stats.womensHealth.provenanceMix.trade_press * 100)
      .toFixed(1);

    expect(block).toContain(`\`${whMillions}\``);
    expect(block).toContain(formatDisclosedBillions(whMillions));
    expect(block).toContain(`\`${adjMillions}\``);
    expect(block).toContain(formatDisclosedBillions(adjMillions));
    expect(block).toContain(`**${secPct}%**`);
    expect(block).toContain(`**${pressPct}%**`);
    expect(block).toContain(`**${stats.womensHealth.dealCount}**`);
    expect(block).toContain(`**${stats.womensHealth.disclosedCount}**`);
  });
});
