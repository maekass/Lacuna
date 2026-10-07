"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import Metric from "@/components/Metric";
import InsufficientDataEmpty from "@/components/ui/InsufficientDataEmpty";
import type { ComparableDealSummary } from "@/lib/deals/dealTypes";
import { DEAL_VALUE_MODEL } from "@/lib/deals/dealMetricModels";
import {
  type DealSort,
  type DealSortKey,
  filterDealRows,
  sortDealRows,
  toggleDealSort,
} from "@/lib/ui/sortDealRows";

const COLUMNS: Array<{ key: DealSortKey; label: string }> = [
  { key: "target", label: "Target" },
  { key: "acquirer", label: "Acquirer" },
  { key: "announced", label: "Announced" },
  { key: "value", label: "Value" },
];

interface SortableDealTableProps<T extends ComparableDealSummary> {
  title: string;
  caption?: string;
  rows: readonly T[];
  emptyTitle: string;
  emptyDescription: string;
  extraHeader?: string;
  extraCell?: (row: T) => ReactNode;
}

export default function SortableDealTable<T extends ComparableDealSummary>({
  title,
  caption,
  rows,
  emptyTitle,
  emptyDescription,
  extraHeader,
  extraCell,
}: SortableDealTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DealSort | null>(null);

  const visible = useMemo(() => {
    const filtered = filterDealRows(rows, query);
    return sort ? sortDealRows(filtered, sort) : filtered;
  }, [rows, query, sort]);

  return (
    <div>
      <h3 className="text-lg font-semibold text-lacuna-plum">{title}</h3>
      {caption
        ? <p className="mt-1 text-xs text-lacuna-blue/80">{caption}</p>
        : null}

      {rows.length === 0
        ? (
          <div className="mt-3">
            <InsufficientDataEmpty
              title={emptyTitle}
              description={emptyDescription}
            />
          </div>
        )
        : (
          <>
            <label className="mt-3 block text-xs text-lacuna-blue/80">
              <span className="sr-only">Filter {title}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter these rows"
                className="w-full max-w-xs rounded-lg border border-lacuna-lavender/50 bg-white/80 px-3 py-1.5 text-sm text-lacuna-plum placeholder:text-lacuna-blue/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lacuna-lavender"
              />
            </label>
            {visible.length === 0
              ? (
                <div className="mt-3">
                  <InsufficientDataEmpty
                    title="No rows match"
                    description="Nothing in this table matches that filter. The underlying disclosed rows are unchanged."
                    actionLabel="Clear filter"
                    onAction={() => setQuery("")}
                  />
                </div>
              )
              : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-lacuna-lavender/40">
                  <table className="min-w-full text-sm">
                    <thead className="bg-lacuna-lavender/20 text-left text-xs uppercase tracking-wide text-lacuna-plum/80">
                      <tr>
                        {COLUMNS.map((column) => {
                          const active = sort?.key === column.key;
                          const ariaSort = active
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none";
                          return (
                            <th
                              key={column.key}
                              aria-sort={ariaSort}
                              className="px-3 py-2 font-medium"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSort((current) =>
                                    toggleDealSort(current, column.key)
                                  )}
                                className="inline-flex items-center gap-1 text-left uppercase tracking-wide text-lacuna-plum/80 hover:text-lacuna-plum"
                              >
                                {column.label}
                                <span
                                  aria-hidden="true"
                                  className="text-[10px]"
                                >
                                  {active
                                    ? sort.direction === "asc" ? "↑" : "↓"
                                    : ""}
                                </span>
                              </button>
                            </th>
                          );
                        })}
                        {extraHeader
                          ? (
                            <th className="px-3 py-2 font-medium">
                              {extraHeader}
                            </th>
                          )
                          : null}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-lacuna-lavender/30"
                        >
                          <td className="px-3 py-2">
                            <Link
                              href={`/deals/${row.id}`}
                              className="font-medium text-lacuna-plum underline-offset-2 hover:text-lacuna-blue hover:underline"
                            >
                              {row.targetName}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-lacuna-blue">
                            {row.acquirerName}
                          </td>
                          <td className="px-3 py-2 text-lacuna-blue/80">
                            {row.announcedLabel}
                          </td>
                          <td className="px-3 py-2 text-lacuna-blue/80">
                            {typeof row.dealValue === "number"
                              ? (
                                <Metric
                                  label={`${row.targetName} disclosed value`}
                                  provenance={{
                                    kind: "proxy",
                                    value: row.dealValue,
                                    model: DEAL_VALUE_MODEL,
                                  }}
                                  formatValue={(millions) =>
                                    `$${millions.toLocaleString()}M`}
                                />
                              )
                              : "Undisclosed"}
                          </td>
                          {extraHeader
                            ? (
                              <td className="px-3 py-2 text-xs text-lacuna-blue/80">
                                {extraCell?.(row) ?? "—"}
                              </td>
                            )
                            : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </>
        )}
    </div>
  );
}
