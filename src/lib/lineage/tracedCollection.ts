import type { InsufficientData, QuantValue } from "@/lib/quant/types";
import { estimateRegisteredMetric, getMetricDeclaration } from "./registry";
import type {
  ExcludedRef,
  Lineage,
  LineageOptions,
  Missingness,
  RecordRef,
  RecordWithSources,
  SourceRef,
  TracedRecord,
  TracedValue,
} from "./types";

interface CollectionState<T> {
  readonly table: string;
  readonly records: readonly TracedRecord<T>[];
  readonly excluded: readonly ExcludedRef[];
  readonly inputCount: number;
  readonly inputRefs: readonly RecordRef[];
  readonly sources: readonly SourceRef[];
  readonly options: LineageOptions;
}

export interface JoinableRecord extends RecordWithSources {
  readonly id: string;
}

function singularize(table: string): string {
  if (table.endsWith("ies")) return `${table.slice(0, -3)}y`;
  if (table.endsWith("s")) return table.slice(0, -1);
  return table;
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

function sourceKey(source: SourceRef): string {
  return JSON.stringify(source);
}

function sourceFromCitation(rawCitation: string): SourceRef {
  return { kind: "citation", rawCitation };
}

function sourcesForRecord(record: RecordWithSources): SourceRef[] {
  const structured = record.sourceRefs ?? [];
  const citations = [
    ...(record.sources ?? []),
    ...(record.source ? [record.source] : []),
  ].map(sourceFromCitation);
  return uniqueBy([...structured, ...citations], sourceKey);
}

function recordSources<T>(record: TracedRecord<T>): SourceRef[] {
  return [...record.sources];
}

function missingnessFor(
  excluded: readonly ExcludedRef[],
  total: number,
): Missingness[] {
  const counts = new Map<string, number>();
  for (const entry of excluded) {
    const field = entry.field ?? entry.reason;
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field, missing]) => ({ field, missing, total }));
}

function makeLineage(
  state: CollectionState<number>,
  metricId: string,
  estimator: string,
  suppression?: string,
): Lineage {
  return {
    metricId,
    estimator,
    inputs: uniqueBy(
      [...state.inputRefs, ...state.excluded.map((entry) => entry.ref)],
      (ref) => `${ref.table}:${ref.id}`,
    ),
    sources: uniqueBy(
      [
        ...state.sources,
        ...state.records.flatMap(recordSources),
      ],
      sourceKey,
    ),
    n: state.records.length,
    excluded: state.excluded,
    missingness: missingnessFor(state.excluded, state.inputCount),
    suppression,
    datasetVersion: state.options.datasetVersion,
    computedAt: state.options.computedAt ?? new Date().toISOString(),
  };
}

function withLineage(
  value: QuantValue<number>,
  lineage: Lineage,
): TracedValue<number> {
  return { ...value, lineage } as TracedValue<number>;
}

export class TracedCollection<T> {
  private constructor(private readonly state: CollectionState<T>) {}

  static fromRecords<T extends JoinableRecord>(
    table: string,
    records: readonly T[],
    options: LineageOptions = {},
  ): TracedCollection<T> {
    const tracedRecords = records.map((record) => ({
      ref: { table, id: record.id },
      value: record,
      sources: sourcesForRecord(record),
    }));
    return new TracedCollection({
      table,
      records: tracedRecords,
      excluded: [],
      inputCount: records.length,
      inputRefs: tracedRecords.map((record) => record.ref),
      sources: tracedRecords.flatMap((record) => record.sources),
      options,
    });
  }

  join<K extends string, R extends JoinableRecord>(
    table: K,
    records: readonly R[],
    on: (value: T) => string | undefined,
    reason = `unmatched_join:${table}`,
  ): TracedCollection<
    T & { readonly [P in K extends `${infer Stem}s` ? Stem : K]: R }
  > {
    const rightById = new Map(records.map((record) => [record.id, record]));
    const joined: TracedRecord<unknown>[] = [];
    const newExcluded = [...this.state.excluded];
    const joinedRefs = [...this.state.inputRefs];
    const relation = singularize(table);

    for (const left of this.state.records) {
      const right = on(left.value);
      const match = right === undefined ? undefined : rightById.get(right);
      if (!match) {
        newExcluded.push({
          ref: left.ref,
          reason,
          field: relation,
        });
        continue;
      }
      joined.push({
        ref: left.ref,
        value: {
          ...(left.value as object),
          [relation]: match,
        },
        sources: uniqueBy(
          [...left.sources, ...sourcesForRecord(match)],
          sourceKey,
        ),
      });
      joinedRefs.push({ table, id: match.id });
    }

    return new TracedCollection({
      table: this.state.table,
      records: joined,
      excluded: newExcluded,
      inputCount: this.state.inputCount,
      inputRefs: uniqueBy(
        joinedRefs,
        (ref) => `${ref.table}:${ref.id}`,
      ),
      sources: uniqueBy(
        [
          ...this.state.sources,
          ...records.flatMap(sourcesForRecord),
        ],
        sourceKey,
      ),
      options: this.state.options,
    }) as TracedCollection<
      T & { readonly [P in K extends `${infer Stem}s` ? Stem : K]: R }
    >;
  }

  exclude(
    predicate: (value: T) => boolean,
    reason: string,
    field?: string,
  ): TracedCollection<T> {
    const kept: TracedRecord<T>[] = [];
    const excluded = [...this.state.excluded];
    for (const record of this.state.records) {
      if (predicate(record.value)) {
        excluded.push({ ref: record.ref, reason, field });
      } else {
        kept.push(record);
      }
    }
    return new TracedCollection({
      ...this.state,
      records: kept,
      excluded,
    });
  }

  map<U>(mapper: (value: T) => U): TracedCollection<U> {
    return new TracedCollection({
      ...this.state,
      records: this.state.records.map((record) => ({
        ...record,
        value: mapper(record.value),
      })),
    });
  }

  estimate(metricId: string): TracedValue<number> {
    const declaration = getMetricDeclaration(metricId);
    const values = this.state.records.map((record) => record.value as number);
    const lineage = makeLineage(
      this.state as CollectionState<number>,
      declaration.id,
      declaration.estimator,
    );
    if (values.length < declaration.minN) {
      const suppressed: InsufficientData = {
        kind: "insufficient",
        code: "small_sample",
        message:
          `n=${values.length} below minimum ${declaration.minN} for ${declaration.label}`,
        sampleSize: values.length,
        minRequired: declaration.minN,
      };
      return withLineage(
        suppressed,
        { ...lineage, suppression: `n<${declaration.minN}` },
      );
    }
    return withLineage(
      estimateRegisteredMetric(declaration, values),
      lineage,
    );
  }

  get n(): number {
    return this.state.records.length;
  }

  get excluded(): readonly ExcludedRef[] {
    return this.state.excluded;
  }

  get sources(): readonly SourceRef[] {
    return this.state.sources;
  }

  get records(): readonly TracedRecord<T>[] {
    return this.state.records;
  }

  get missingness(): readonly Missingness[] {
    return missingnessFor(this.state.excluded, this.state.inputCount);
  }
}

export const fromRecords = TracedCollection.fromRecords;
