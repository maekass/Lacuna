import type { InsufficientData, QuantValue } from "@/lib/quant/types";
import { estimateRegisteredMetric, getMetricDeclaration } from "./registry";
import type {
  DatasetTable,
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
  readonly table: DatasetTable;
  readonly records: readonly TracedRecord<T>[];
  readonly excluded: readonly ExcludedRef[];
  readonly inputCount: number;
  readonly supporting: readonly RecordRef[];
  readonly options: LineageOptions;
}

export interface JoinableRecord extends RecordWithSources {
  readonly id: string;
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
  return source.url ??
    source.secAccession ??
    `${source.kind}:${source.rawCitation}`;
}

function sourceFromCitation(rawCitation: string): SourceRef {
  return { kind: "prose", rawCitation };
}

function sourcesForRecord(record: RecordWithSources): SourceRef[] {
  const structured = record.sourceRefs ?? [];
  const citations = [
    ...(record.sources ?? []),
    ...(record.source ? [record.source] : []),
  ].map(sourceFromCitation);
  return uniqueBy([...structured, ...citations], sourceKey);
}

function missingnessFor(
  excluded: readonly ExcludedRef[],
): Missingness[] {
  const counts = new Map<string, { missing: number; total: number }>();
  for (const entry of excluded) {
    if (!entry.field) continue;
    const key = `${entry.field}:${entry.evaluatedCount}`;
    const current = counts.get(key) ?? {
      missing: 0,
      total: entry.evaluatedCount,
    };
    current.missing += 1;
    counts.set(key, current);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      field: key.slice(0, key.lastIndexOf(":")),
      ...value,
    }));
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
    inputs: state.records.map((record) => record.ref),
    supporting: state.supporting,
    sources: uniqueBy(
      state.records.flatMap((record) => record.sources),
      sourceKey,
    ),
    n: state.records.length,
    originalInputCount: state.inputCount,
    excluded: state.excluded,
    missingness: missingnessFor(state.excluded),
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
    table: RecordRef["table"],
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
      supporting: [],
      options,
    });
  }

  join<Relation extends string, R extends JoinableRecord>(
    table: RecordRef["table"],
    relation: Relation,
    records: readonly R[],
    on: (value: T) => string | undefined,
    reason = `unmatched_join:${table}`,
  ): TracedCollection<T & { readonly [P in Relation]: R }> {
    const rightById = new Map(records.map((record) => [record.id, record]));
    const joined: TracedRecord<
      T & { readonly [P in Relation]: R }
    >[] = [];
    const newExcluded = [...this.state.excluded];
    const joinedRefs: RecordRef[] = [];

    for (const left of this.state.records) {
      const right = on(left.value);
      const match = right === undefined ? undefined : rightById.get(right);
      if (!match) {
        newExcluded.push({
          ref: left.ref,
          reason,
          field: relation,
          evaluatedCount: this.state.records.length,
        });
        continue;
      }
      joined.push({
        ref: left.ref,
        value: {
          ...(left.value as object),
          [relation]: match,
        } as T & { readonly [P in Relation]: R },
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
      supporting: uniqueBy(
        [...this.state.supporting, ...joinedRefs],
        (ref) => `${ref.table}:${ref.id}`,
      ),
      options: this.state.options,
    });
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
        excluded.push({
          ref: record.ref,
          reason,
          field,
          evaluatedCount: this.state.records.length,
        });
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

  estimate(
    this: TracedCollection<number>,
    metricId: string,
  ): TracedValue<number> {
    const declaration = getMetricDeclaration(metricId);
    const values = this.state.records.map((record) => record.value);
    const lineage = makeLineage(
      this.state,
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
    return uniqueBy(
      this.state.records.flatMap((record) => record.sources),
      sourceKey,
    );
  }

  get records(): readonly TracedRecord<T>[] {
    return this.state.records;
  }

  get missingness(): readonly Missingness[] {
    return missingnessFor(this.state.excluded);
  }
}

export const fromRecords = TracedCollection.fromRecords;
