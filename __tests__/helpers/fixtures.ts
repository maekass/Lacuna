import verifiedJson from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { parseStaticVerifiedDatasetJson } from "@/lib/data/staticDataset";
import type {
  AcquirerRow,
  AcquisitionRow,
  CompanyRow,
  ProvenanceRow,
} from "@/lib/data/mapVerifiedDataset";

const full = parseStaticVerifiedDatasetJson(verifiedJson);

/** Minimal slice of the real verified JSON — not invented companies or deals. */
export const minimalVerifiedDataset: VerifiedDataset = {
  provenance: full.provenance,
  companies: full.companies.filter((c) => c.id === "c24" || c.id === "c39"),
  acquirers: full.acquirers.filter((a) => a.id === "acquirer-hologic"),
  acquisitions: full.acquisitions.filter((d) => d.id === "deal7"),
};

const company = minimalVerifiedDataset.companies[0];
const hologicAcquirer = full.acquirers.find((a) => a.id === "acquirer-hologic");
if (!hologicAcquirer) {
  throw new Error("fixture acquirer-hologic missing from verified dataset");
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
  founded: company.founded ?? 0,
  hq: company.hq ?? "Unknown",
  description: company.description ?? "",
  last_known_valuation: company.lastKnownValuation ?? null,
  valuation_source: company.valuationSource ?? null,
  total_funding: company.totalFunding ?? null,
  sources: company.sources ?? [],
};

export const sampleAcquirerRow: AcquirerRow = {
  id: hologicAcquirer.id,
  name: hologicAcquirer.name,
  ticker: hologicAcquirer.ticker ?? null,
  sector: hologicAcquirer.sector,
  hq: hologicAcquirer.hq,
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
