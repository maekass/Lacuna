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
  acquirers: full.acquirers.filter((a) => a.id === "acquirer-ro"),
  acquisitions: full.acquisitions.filter((d) => d.id === "deal2"),
};

const company = minimalVerifiedDataset.companies[0];
const teladocAcquirer = full.acquirers.find((a) => a.id === "acquirer-teladoc");
if (!teladocAcquirer) {
  throw new Error("fixture acquirer-teladoc missing from verified dataset");
}
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
  id: teladocAcquirer.id,
  name: teladocAcquirer.name,
  ticker: teladocAcquirer.ticker ?? null,
  sector: teladocAcquirer.sector,
  hq: teladocAcquirer.hq,
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
