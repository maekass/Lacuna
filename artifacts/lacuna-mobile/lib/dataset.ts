import rawDataset from "@/data/dataset.json";

export interface Company {
  id: string;
  name: string;
  sector: string;
  stage: string;
  founded: number;
  hq: string;
  description: string;
  lastKnownValuation?: number;
  valuationSource?: string;
  totalFunding?: number;
  sources?: string[];
}

export interface Acquirer {
  id: string;
  name: string;
  ticker?: string;
  sector: string;
  hq: string;
}

export interface Acquisition {
  id: string;
  targetId: string;
  acquirerId: string;
  targetName: string;
  acquirerName: string;
  announcedDate: string;
  closedDate?: string;
  dealValue?: number;
  dealValueNote?: string;
  dealType: string;
  source: string;
  strategicRationale: string;
}

export interface Dataset {
  provenance: {
    lastUpdated: string;
    datasetVersion?: string;
    sources: string[];
    notes: string[];
    purpose: string;
    disclaimer: string;
  };
  companies: Company[];
  acquirers: Acquirer[];
  acquisitions: Acquisition[];
}

// @ts-ignore
const dataset = rawDataset as Dataset;

export const companies: Company[] = dataset.companies;
export const acquirers: Acquirer[] = dataset.acquirers;
export const acquisitions: Acquisition[] = dataset.acquisitions;
export const provenance = dataset.provenance;

export function getTotalDealValue(): number {
  return acquisitions.reduce((sum, a) => sum + (a.dealValue ?? 0), 0);
}

export function getDealsByYear(): Array<{ year: number; count: number }> {
  const map = new Map<number, number>();
  for (const acq of acquisitions) {
    const year = parseInt(acq.announcedDate.slice(0, 4), 10);
    if (!isNaN(year)) map.set(year, (map.get(year) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

export function getSectorCounts(): Array<{ sector: string; count: number }> {
  const map = new Map<string, number>();
  for (const c of companies) {
    map.set(c.sector, (map.get(c.sector) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAcquirerDealCounts(): Array<{ name: string; count: number; id: string }> {
  const map = new Map<string, { name: string; count: number }>();
  for (const acq of acquisitions) {
    const existing = map.get(acq.acquirerId);
    if (existing) existing.count++;
    else map.set(acq.acquirerId, { name: acq.acquirerName, count: 1 });
  }
  return Array.from(map.entries())
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatDealValue(value?: number): string {
  if (!value) return "Undisclosed";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value}M`;
}
