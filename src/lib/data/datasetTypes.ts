import type { EvidenceClass } from "../evidence";

export type DataMode = "static" | "db";

export interface VerifiedDataset {
  provenance: {
    lastUpdated: string;
    datasetVersion?: string;
    sources: string[];
    notes: string[];
    purpose: string;
    disclaimer: string;
  };
  companies: Array<{
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
    /**
     * Research-x-transactions evidence taxonomy. Optional at the raw-data layer:
     * the static JSON carries it for every company, and the DB path is backfilled
     * by `classifyEvidence` in `buildVerifiedDerivedData`, so the derived
     * `VerifiedCompanyView.evidenceClass` is always present.
     */
    evidenceClass?: EvidenceClass;
  }>;
  acquirers: Array<{
    id: string;
    name: string;
    ticker?: string;
    sector: string;
    hq: string;
  }>;
  acquisitions: Array<{
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
  }>;
}
