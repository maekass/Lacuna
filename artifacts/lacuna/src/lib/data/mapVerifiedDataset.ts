import type { VerifiedDataset } from "./datasetTypes";

export interface ProvenanceRow {
  last_updated: Date | string;
  purpose: string;
  disclaimer: string;
  sources: string[];
  notes: string[];
}

export interface CompanyRow {
  id: string;
  name: string;
  sector: string;
  stage: string;
  founded: number;
  hq: string;
  description: string;
  last_known_valuation: string | number | null;
  valuation_source: string | null;
  total_funding: string | number | null;
  sources: string[];
}

export interface AcquirerRow {
  id: string;
  name: string;
  ticker: string | null;
  sector: string;
  hq: string;
}

export interface AcquisitionRow {
  id: string;
  target_id: string;
  acquirer_id: string;
  target_name: string;
  acquirer_name: string;
  announced_date: Date | string;
  closed_date: Date | string | null;
  deal_value: string | number | null;
  deal_value_note: string | null;
  deal_type: string;
  source: string;
  strategic_rationale: string;
}

function toIsoDate(
  value: Date | string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toNumber(
  value: string | number | null | undefined,
): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function mapRowsToVerifiedDataset(
  provenance: ProvenanceRow,
  companies: CompanyRow[],
  acquirers: AcquirerRow[],
  acquisitions: AcquisitionRow[],
): VerifiedDataset {
  return {
    provenance: {
      lastUpdated: toIsoDate(provenance.last_updated) ?? "",
      purpose: provenance.purpose,
      disclaimer: provenance.disclaimer,
      sources: provenance.sources ?? [],
      notes: provenance.notes ?? [],
    },
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
      stage: c.stage,
      founded: c.founded,
      hq: c.hq,
      description: c.description,
      lastKnownValuation: toNumber(c.last_known_valuation),
      valuationSource: c.valuation_source ?? undefined,
      totalFunding: toNumber(c.total_funding),
      sources: c.sources ?? [],
    })),
    acquirers: acquirers.map((a) => ({
      id: a.id,
      name: a.name,
      ticker: a.ticker ?? undefined,
      sector: a.sector,
      hq: a.hq,
    })),
    acquisitions: acquisitions.map((d) => ({
      id: d.id,
      targetId: d.target_id,
      acquirerId: d.acquirer_id,
      targetName: d.target_name,
      acquirerName: d.acquirer_name,
      announcedDate: toIsoDate(d.announced_date) ?? "",
      closedDate: toIsoDate(d.closed_date),
      dealValue: toNumber(d.deal_value),
      dealValueNote: d.deal_value_note ?? undefined,
      dealType: d.deal_type,
      source: d.source,
      strategicRationale: d.strategic_rationale,
    })),
  };
}
