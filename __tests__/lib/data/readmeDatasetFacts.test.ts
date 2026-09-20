import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyConsumerHealthScope,
  applyMedBiotechScope,
} from "@/lib/data/medBiotechFilters";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

/**
 * Pins README.md headline catalog facts to the verified dataset so the
 * landing doc cannot silently drift (e.g. n=58 vs 59, 135 vs 150 companies).
 */
describe("README.md matches verified dataset headlines", () => {
  const dataset = getStaticVerifiedDataset();
  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  const med = applyMedBiotechScope(dataset);
  const consumer = applyConsumerHealthScope(dataset);
  const disclosed =
    dataset.acquisitions.filter((deal) => typeof deal.dealValue === "number")
      .length;
  const portfolioCount =
    dataset.companies.filter((company) =>
      company.evidenceClass === "portfolio_investment"
    ).length;

  it("states live company, acquirer, and deal counts (success)", () => {
    expect(readme).toContain(`${dataset.acquisitions.length} verified deals`);
    expect(readme).toContain(`${dataset.companies.length} companies`);
    expect(readme).toContain(`${dataset.acquirers.length} acquirers`);
    expect(readme).toContain(`n=${dataset.acquisitions.length} verified deals`);
    expect(readme).toContain(
      `provenance.lastUpdated: ${dataset.provenance.lastUpdated}`,
    );
    expect(dataset.provenance.datasetVersion).toBeTruthy();
    expect(readme).toContain(
      `dataset.verified.json\` ${dataset.provenance.datasetVersion}`,
    );
  });

  it("states dual-scope split and disclosure coverage (success)", () => {
    expect(readme).toContain(
      `**${med.acquisitions.length} medicine & biotech acquisitions**`,
    );
    expect(readme).toContain(
      `**${consumer.acquisitions.length} consumer health acquisitions**`,
    );
    expect(readme).toContain(
      `${disclosed} of ${dataset.acquisitions.length} deals`,
    );
    expect(readme).toContain(
      `**${portfolioCount} fund portfolio investments**`,
    );
  });

  it("does not advertise invented TAM/SAM market-size cells (edge)", () => {
    expect(readme).not.toMatch(/Public market-size estimate/i);
    expect(readme).not.toContain("$12B");
    expect(readme).not.toContain("$34B");
  });
});
