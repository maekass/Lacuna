import verifiedJson from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type {
  AcquirerRow,
  AcquisitionRow,
  CompanyRow,
  ProvenanceRow,
} from "@/lib/data/mapVerifiedDataset";

const full = verifiedJson as VerifiedDataset;

/** Minimal slice of the real verified JSON — not invented companies or deals. */
export const minimalVerifiedDataset: VerifiedDataset = {
  provenance: full.provenance,
  companies: full.companies.filter((c) => c.id === "c1" || c.id === "c2"),
  acquirers: full.acquirers.slice(0, 1),
  acquisitions: full.acquisitions.filter((d) => d.id === "deal2"),
};

const company = minimalVerifiedDataset.companies[0];
const acquirer = minimalVerifiedDataset.acquirers[0];
const deal = minimalVerifiedDataset.acquisitions[0];

export const sampleProvenanceRow: ProvenanceRow = {
  last_updated: minimalVerifiedDataset.provenance.lastUpdated,
  purpose: minimalVerifiedDataset.provenance.purpose,
  disclaimer: minimalVerifiedDataset.provenance.disclaimer,
  sources: minimalVerifiedDataset.provenance.sources,
  notes: minimalVerifiedDataset.provenance.notes,
};

export const sampleCompanyRow: CompanyRow = {
  id: company.id,
  name: company.name,
  sector: company.sector,
  stage: company.stage,
  founded: company.founded,
  hq: company.hq,
  description: company.description,
  last_known_valuation: company.lastKnownValuation ?? null,
  valuation_source: company.valuationSource ?? null,
  total_funding: company.totalFunding ?? null,
  sources: company.sources ?? [],
};

export const sampleAcquirerRow: AcquirerRow = {
  id: acquirer.id,
  name: acquirer.name,
  ticker: acquirer.ticker ?? null,
  sector: acquirer.sector,
  hq: acquirer.hq,
};

export const sampleAcquisitionRow: AcquisitionRow = {
  id: deal.id,
  target_id: deal.targetId,
  acquirer_id: deal.acquirerId,
  target_name: deal.targetName,
  acquirer_name: deal.acquirerName,
  announced_date: deal.announcedDate,
  closed_date: deal.closedDate ?? null,
  deal_value: deal.dealValue ?? null,
  deal_value_note: deal.dealValueNote ?? null,
  deal_type: deal.dealType,
  source: deal.source,
  strategic_rationale: deal.strategicRationale,
};
