import type {
  InsufficientData,
  QuantValue,
  Sufficient,
} from "@/lib/quant/types";

export type DatasetTable =
  | "companies"
  | "acquirers"
  | "acquisitions"
  | "cpt_codes"
  | "hcpcs_codes"
  | "clinical_trials"
  | "sec_filings";

export interface RecordRef {
  readonly table: DatasetTable;
  readonly id: string;
}

export type SourceKind =
  | "sec_filing"
  | "press"
  | "crunchbase"
  | "company_site"
  | "exchange_filing"
  | "cms"
  | "prose";

export interface SourceRef {
  readonly kind: SourceKind;
  readonly rawCitation: string;
  readonly url?: string;
  readonly secAccession?: string;
  readonly publisher?: string;
  readonly retrievedAt?: string;
  readonly quote?: string;
}

export interface ExcludedRef {
  readonly ref: RecordRef;
  readonly reason: string;
  readonly field?: string;
  readonly evaluatedCount: number;
}

export interface Missingness {
  readonly field: string;
  readonly missing: number;
  readonly total: number;
}

export interface ContributorValue {
  readonly ref: RecordRef;
  readonly field: string;
  readonly value: number;
}

export interface ExclusionSummary {
  readonly reason: string;
  readonly count: number;
}

export interface LineageSummary {
  readonly metricId: string;
  readonly estimator: string;
  readonly n: number;
  readonly originalInputCount: number;
  readonly excluded: readonly ExclusionSummary[];
  readonly missingness: readonly Missingness[];
  readonly contributors: readonly ContributorValue[];
  readonly suppression?: string;
  readonly datasetVersion?: string;
  readonly datasetHash?: string;
  readonly computedAt: string;
}

export interface Lineage {
  readonly metricId: string;
  readonly estimator: string;
  readonly inputs: readonly RecordRef[];
  readonly supporting: readonly RecordRef[];
  readonly sources: readonly SourceRef[];
  readonly contributors: readonly ContributorValue[];
  readonly n: number;
  readonly originalInputCount: number;
  readonly excluded: readonly ExcludedRef[];
  readonly missingness: readonly Missingness[];
  readonly suppression?: string;
  readonly datasetVersion?: string;
  readonly datasetHash?: string;
  readonly computedAt: string;
}

export type TracedSufficient<T extends number = number> = Sufficient<T> & {
  readonly lineage: Lineage;
};

export type TracedInsufficientData = InsufficientData & {
  readonly lineage: Lineage;
};

export type TracedValue<T extends number = number> =
  | TracedSufficient<T>
  | TracedInsufficientData;

export interface LineageOptions {
  readonly datasetVersion?: string;
  readonly datasetHash?: string;
  readonly computedAt?: string;
}

export interface RecordWithSources {
  readonly id: string;
  readonly source?: string;
  readonly sources?: readonly string[];
  readonly sourceRefs?: readonly SourceRef[];
}

export type TracedRecord<T> = {
  readonly ref: RecordRef;
  readonly value: T;
  readonly valueField?: string;
  readonly sources: readonly SourceRef[];
  readonly supporting: readonly RecordRef[];
};

export type QuantValueWithLineage<T extends number = number> = QuantValue<T> & {
  readonly lineage: Lineage;
};
