export interface Company {
  id: string;
  name: string;
  sector:
    | "Fertility"
    | "Mental Health"
    | "Cardiovascular"
    | "Oncology"
    | "Menopause"
    | "Pelvic Health"
    | "General Wellness"
    | "Wearables"
    | "Sexual Wellness"
    | "Breast Health"
    | "Gynecological Surgery"
    | "Reproductive Health"
    | "Diagnostics"
    | "Contraception"
    | "Precision Medicine"
    | "Maternal Health"
    | "Medical Devices"
    | "Dermatology"
    | "Digital Health";
  stage:
    | "Seed"
    | "Series A"
    | "Series B"
    | "Series C"
    | "Series D"
    | "Series F"
    | "Late Stage"
    | "Pre-IPO"
    | "Public";
  founded?: number;
  valuation?: number;
  employees: number;
  hq?: string;
  description?: string;
}

export interface Acquisition {
  id: string;
  targetId: string;
  acquirerId: string;
  announcedDate: string;
  closedDate?: string;
  dealValue?: number;
  dealType:
    | "Acquisition"
    | "Merger"
    | "Strategic Investment"
    | "Asset Purchase"
    | "Asset Acquisition"
    | "License/Asset Acquisition";
  strategicRationale: string;
  multiples?: {
    revenue?: number;
    ebitda?: number;
  };
}

export type Sector = Company["sector"];
export type Stage = Company["stage"];
export type DealType = Acquisition["dealType"];
export type Money = number;

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

export interface DealMetrics {
  totalValue: Money;
  averageValue: Money;
  medianValue: Money;
  dealCount: number;
  byYear: Map<number, number>;
  bySector: Map<Sector, number>;
}

export interface SimilarityScore {
  company: Company;
  similarity: number;
  sharedFactors: string[];
  vector: number[];
}

export interface MarketCluster {
  id: number;
  name: string;
  companies: Company[];
  centroid: { valuation: number; employees: number };
  characteristics: string[];
  avgValuation: Money;
  avgEmployees: number;
}

export interface ExitPrediction {
  companyId: string;
  companyName: string;
  exitProbability: number;
  predictedAcquirer: string;
  confidence: number;
  factors: string[];
  calculatedAt: Date;
}
