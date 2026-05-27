// Branded types for type safety
export type CompanyId = string & { readonly __brand: unique symbol };
export type AcquisitionId = string & { readonly __brand: unique symbol };
export type Money = number & { readonly __brand: unique symbol };

// Domain-specific types
export type Sector = 
  | 'Fertility' 
  | 'Mental Health' 
  | 'Cardiovascular' 
  | 'Oncology' 
  | 'Menopause' 
  | 'Pelvic Health' 
  | 'General Wellness' 
  | 'Wearables' 
  | 'Sexual Wellness';

export type Stage = 
  | 'Seed' 
  | 'Series A' 
  | 'Series B' 
  | 'Series C' 
  | 'Series D' 
  | 'Series F' 
  | 'Late Stage' 
  | 'Pre-IPO' 
  | 'Public';

export type DealType = 
  | 'Acquisition' 
  | 'Merger' 
  | 'Strategic Investment' 
  | 'Asset Purchase';

// Core interfaces with strict typing
export interface Company {
  readonly id: CompanyId;
  readonly name: string;
  readonly sector: Sector;
  readonly stage: Stage;
  readonly founded: number;
  readonly valuation?: Money;
  readonly employees: number;
  readonly hq: string;
  readonly description: string;
}

export interface Acquisition {
  readonly id: AcquisitionId;
  readonly targetId: CompanyId;
  readonly acquirerId: CompanyId;
  readonly announcedDate: Date;
  readonly closedDate?: Date;
  readonly dealValue?: Money;
  readonly dealType: DealType;
  readonly strategicRationale: string;
  readonly multiples?: {
    readonly revenue?: number;
    readonly ebitda?: number;
  };
}

// Validation result type
export interface ValidationResult<T> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: readonly string[];
}

// Statistics types
export interface DealMetrics {
  readonly totalValue: Money;
  readonly averageValue: Money;
  readonly medianValue: Money;
  readonly dealCount: number;
  readonly byYear: ReadonlyMap<number, number>;
  readonly bySector: ReadonlyMap<Sector, number>;
}

// Network graph types
export interface NetworkNode {
  readonly id: string;
  readonly name: string;
  readonly type: 'target' | 'acquirer';
  readonly sector: Sector;
  readonly stage: Stage | 'Acquirer';
  readonly valuation: Money;
  readonly x?: number;
  readonly y?: number;
}

export interface NetworkLink {
  readonly source: string | NetworkNode;
  readonly target: string | NetworkNode;
  readonly value: Money;
  readonly dealType: DealType;
  readonly date: Date;
}

// ML prediction types
export interface ExitPrediction {
  readonly companyId: CompanyId;
  readonly companyName: string;
  readonly exitProbability: number;
  readonly predictedAcquirer: string;
  readonly confidence: number;
  readonly factors: readonly string[];
  readonly calculatedAt: Date;
}

export interface SimilarityScore {
  readonly company: Company;
  readonly similarity: number;
  readonly sharedFactors: readonly string[];
  readonly vector: readonly number[];
}

export interface MarketCluster {
  readonly id: number;
  readonly name: string;
  readonly companies: readonly Company[];
  readonly centroid: { readonly valuation: number; readonly employees: number };
  readonly characteristics: readonly string[];
  readonly avgValuation: Money;
  readonly avgEmployees: number;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ReadonlyArray<T> = readonly T[];
