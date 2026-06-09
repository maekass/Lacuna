/**
 * Serializes Lacuna dataset into structured text for Gamma generation.
 * Formats M&A deals, sector breakdown, and key analytics into
 * presentation-ready content.
 */

interface CompanyView {
  id: string;
  name: string;
  sector: string;
  hq: string;
}

interface AcquirerView {
  id: string;
  name: string;
  sector: string;
  hq: string;
}

interface AcquisitionView {
  id: string;
  acquirerId: string;
  targetId: string;
  targetName: string;
  acquirerName: string;
  announcedDate: string;
  dealValue?: number;
}

interface LacunaDataset {
  companies: CompanyView[];
  acquirers: AcquirerView[];
  acquisitions: AcquisitionView[];
}

export type ExportScope = "full" | "deals-only" | "analytics-only";

/**
 * Format Lacuna dataset as structured text for Gamma API inputText.
 * Organizes content into logical sections that translate well to slides.
 */
export function formatLacunaForGamma(
  dataset: LacunaDataset,
  scope: ExportScope = "full",
): string {
  const sections: string[] = [];

  sections.push("# Women's Health M&A Intelligence Report");
  sections.push("");
  sections.push(
    "Source: Lacuna — verified public filings (SEC EDGAR, press releases, ClinicalTrials.gov)",
  );
  sections.push(
    `Dataset: ${dataset.acquisitions.length} acquisitions · ${dataset.companies.length} companies · ${dataset.acquirers.length} acquirers`,
  );
  sections.push("");

  if (scope === "full" || scope === "deals-only") {
    sections.push(...formatDealOverview(dataset));
    sections.push(...formatTopDeals(dataset));
    sections.push(...formatSectorBreakdown(dataset));
    sections.push(...formatGeographicSpread(dataset));
  }

  if (scope === "full" || scope === "analytics-only") {
    sections.push(...formatAcquirerAnalysis(dataset));
    sections.push(...formatTimelineAnalysis(dataset));
  }

  sections.push("");
  sections.push("---");
  sections.push(
    "Data provenance: All M&A data sourced from public SEC EDGAR filings, company press releases, and verified news coverage. Licensed under BUSL 1.1. Educational use only — not investment advice.",
  );

  return sections.join("\n");
}

function formatDealOverview(dataset: LacunaDataset): string[] {
  const totalValue = dataset.acquisitions.reduce(
    (sum, a) => sum + (a.dealValue || 0),
    0,
  );
  const disclosed =
    dataset.acquisitions.filter((a) => a.dealValue && a.dealValue > 0).length;

  return [
    "## Deal Overview",
    "",
    `- Total acquisitions tracked: ${dataset.acquisitions.length}`,
    `- Disclosed deal value: $${(totalValue / 1000).toFixed(1)}B`,
    `- Deals with disclosed pricing: ${disclosed} of ${dataset.acquisitions.length} (${
      Math.round((disclosed / dataset.acquisitions.length) * 100)
    }%)`,
    `- Active acquirers: ${dataset.acquirers.length}`,
    "",
  ];
}

function formatTopDeals(dataset: LacunaDataset): string[] {
  const sorted = [...dataset.acquisitions]
    .filter((a) => a.dealValue && a.dealValue > 0)
    .sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0))
    .slice(0, 10);

  const lines = ["## Top 10 Deals by Value", ""];

  for (const deal of sorted) {
    const year = deal.announcedDate
      ? new Date(deal.announcedDate).getFullYear()
      : "N/A";
    const value = deal.dealValue
      ? `$${(deal.dealValue / 1000).toFixed(1)}B`
      : "Undisclosed";
    lines.push(
      `- ${deal.acquirerName} → ${deal.targetName} (${year}): ${value}`,
    );
  }

  lines.push("");
  return lines;
}

function formatSectorBreakdown(dataset: LacunaDataset): string[] {
  const sectorCounts: Record<string, number> = {};
  const sectorValue: Record<string, number> = {};

  for (const deal of dataset.acquisitions) {
    const target = dataset.companies.find((c) => c.id === deal.targetId);
    const sector = target?.sector || "Other";
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    sectorValue[sector] = (sectorValue[sector] || 0) + (deal.dealValue || 0);
  }

  const sorted = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
  const lines = ["## Sector Breakdown", ""];

  for (const [sector, count] of sorted) {
    const value = sectorValue[sector];
    const valueStr = value > 0 ? ` · $${(value / 1000).toFixed(1)}B` : "";
    lines.push(`- ${sector}: ${count} deals${valueStr}`);
  }

  lines.push("");
  return lines;
}

function formatGeographicSpread(dataset: LacunaDataset): string[] {
  const regions: Record<string, number> = {};

  for (const deal of dataset.acquisitions) {
    const target = dataset.companies.find((c) => c.id === deal.targetId);
    const hq = target?.hq || "Unknown";
    regions[hq] = (regions[hq] || 0) + 1;
  }

  const sorted = Object.entries(regions).sort((a, b) => b[1] - a[1]).slice(
    0,
    10,
  );
  const lines = ["## Geographic Distribution (Top Targets)", ""];

  for (const [location, count] of sorted) {
    lines.push(`- ${location}: ${count} targets`);
  }

  lines.push("");
  return lines;
}

function formatAcquirerAnalysis(dataset: LacunaDataset): string[] {
  const acquirerDeals: Record<string, { count: number; value: number }> = {};

  for (const deal of dataset.acquisitions) {
    const name = deal.acquirerName;
    if (!acquirerDeals[name]) acquirerDeals[name] = { count: 0, value: 0 };
    acquirerDeals[name].count += 1;
    acquirerDeals[name].value += deal.dealValue || 0;
  }

  const sorted = Object.entries(acquirerDeals).sort((a, b) =>
    b[1].count - a[1].count
  ).slice(0, 10);
  const lines = ["## Most Active Acquirers", ""];

  for (const [name, data] of sorted) {
    const valueStr = data.value > 0
      ? ` · $${(data.value / 1000).toFixed(1)}B total`
      : "";
    lines.push(`- ${name}: ${data.count} acquisitions${valueStr}`);
  }

  lines.push("");
  return lines;
}

function formatTimelineAnalysis(dataset: LacunaDataset): string[] {
  const yearCounts: Record<number, number> = {};

  for (const deal of dataset.acquisitions) {
    if (deal.announcedDate) {
      const year = new Date(deal.announcedDate).getFullYear();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  }

  const sorted = Object.entries(yearCounts)
    .map(([y, c]) => [parseInt(y), c] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const lines = ["## Deal Activity by Year", ""];

  for (const [year, count] of sorted) {
    lines.push(`- ${year}: ${count} deals`);
  }

  lines.push("");
  return lines;
}
