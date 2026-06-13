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
