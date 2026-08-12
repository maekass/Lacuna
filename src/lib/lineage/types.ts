import type {
  InsufficientData,
  QuantValue,
  Sufficient,
} from "@/lib/quant/types";

export interface RecordRef {
  readonly table: string;
  readonly id: string;
}

export interface SourceRef {
  readonly kind: string;
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
}

export interface Missingness {
  readonly field: string;
  readonly missing: number;
  readonly total: number;
}

export interface Lineage {
  readonly metricId: string;
  readonly estimator: string;
  readonly inputs: readonly RecordRef[];
  readonly sources: readonly SourceRef[];
  readonly n: number;
  readonly excluded: readonly ExcludedRef[];
  readonly missingness: readonly Missingness[];
  readonly suppression?: string;
  readonly datasetVersion?: string;
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
  readonly sources: readonly SourceRef[];
};

export type QuantValueWithLineage<T extends number = number> = QuantValue<T> & {
  readonly lineage: Lineage;
};
