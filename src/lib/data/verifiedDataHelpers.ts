import type { VerifiedDataset } from "./datasetTypes";
import {
  classifyEvidence,
  type EvidenceClass,
  isEvidenceClass,
} from "../evidence";

export interface VerifiedCompanyView {
  readonly id: string;
  readonly name: string;
  readonly sector: string;
  readonly stage: string;
  readonly founded?: number;
  readonly hq?: string;
  readonly description?: string;
  readonly lastKnownValuation?: number;
  readonly valuationSource?: string;
  readonly totalFunding?: number;
  readonly sources: readonly string[];
  /** Evidence taxonomy: stored value when valid, else derived by the classifier. */
  readonly evidenceClass: EvidenceClass;
}

export interface VerifiedAcquisitionView {
  readonly id: string;
  readonly targetId: string;
  readonly acquirerId: string;
  readonly targetName: string;
  readonly acquirerName: string;
  readonly announcedDate: string;
  readonly closedDate?: string;
  readonly dealValue?: number;
  readonly dealValueNote?: string;
  readonly dealType: string;
  readonly strategicRationale: string;
  readonly source: string;
}

export interface VerifiedAcquirerView {
  readonly id: string;
  readonly name: string;
  readonly ticker?: string;
  readonly sector: string;
  readonly hq: string;
}

export interface VerifiedDerivedData {
  verifiedCompanies: VerifiedCompanyView[];
  verifiedAcquisitions: VerifiedAcquisitionView[];
  verifiedAcquirers: VerifiedAcquirerView[];
  dataProvenance: VerifiedDataset["provenance"];
  getVerifiedNetworkNodes: () => Array<{
    id: string;
    name: string;
    type: "target" | "acquirer";
    sector: string;
    stage: string;
    valuation: number;
  }>;
  getVerifiedNetworkLinks: () => Array<{
    source: string;
    target: string;
    value: number;
    dealType: string;
    date: string;
  }>;
  getVerifiedTotalDealValue: () => number;
  getVerifiedDealsByYear: () => Array<{ year: number; count: number }>;
}

export function buildVerifiedDerivedData(
  dataset: VerifiedDataset,
): VerifiedDerivedData {
  const verifiedCompanies: VerifiedCompanyView[] = dataset.companies.map((
    c,
  ) => ({
    ...c,
    sources: c.sources ?? [],
    evidenceClass: isEvidenceClass(c.evidenceClass)
      ? c.evidenceClass
      : classifyEvidence(c),
  }));

  const verifiedAcquisitions: VerifiedAcquisitionView[] = dataset.acquisitions
    .map((d) => ({
      ...d,
    }));

  const verifiedAcquirers: VerifiedAcquirerView[] = dataset.acquirers.map((
    a,
  ) => ({
    ...a,
  }));

  const dataProvenance = dataset.provenance;

  return {
    verifiedCompanies,
    verifiedAcquisitions,
    verifiedAcquirers,
    dataProvenance,
    getVerifiedNetworkNodes: () => [
      ...verifiedCompanies.map((c) => ({
        id: c.id,
        name: c.name,
        type: "target" as const,
        sector: c.sector,
        stage: c.stage,
        valuation: c.lastKnownValuation ?? -1,
      })),
      ...verifiedAcquirers.map((a) => ({
        id: a.id,
        name: a.name,
        type: "acquirer" as const,
        sector: a.sector,
        stage: "Acquirer" as const,
        valuation: -1,
      })),
    ],
    getVerifiedNetworkLinks: () =>
      verifiedAcquisitions.map((deal) => ({
        source: deal.targetId,
        target: deal.acquirerId,
        value: deal.dealValue ?? -1,
        dealType: deal.dealType,
        date: deal.announcedDate,
      })),
    getVerifiedTotalDealValue: () =>
      verifiedAcquisitions.reduce(
        (sum, deal) => sum + (deal.dealValue ?? 0),
        0,
      ),
    getVerifiedDealsByYear: () => {
      const yearMap = verifiedAcquisitions.reduce<Record<number, number>>(
        (acc, deal) => {
          const year = new Date(deal.announcedDate).getFullYear();
          acc[year] = (acc[year] ?? 0) + 1;
          return acc;
        },
        {},
      );
      return Object.entries(yearMap)
        .map(([year, count]) => ({ year: parseInt(year, 10), count }))
        .sort((a, b) => a.year - b.year);
    },
  };
}
