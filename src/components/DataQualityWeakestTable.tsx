"use client";

import { useMemo, useState } from "react";
import type { WeakCompanyRow } from "@/lib/data/dataQualityView";

type SortKey = "name" | "grade" | "score" | "sector";

interface DataQualityWeakestTableProps {
  readonly rows: readonly WeakCompanyRow[];
}

function sortRows(
  rows: readonly WeakCompanyRow[],
  key: SortKey,
  dir: 1 | -1,
): WeakCompanyRow[] {
  return [...rows].sort((left, right) => {
    const cmp = key === "score"
      ? Number(left.scoreLabel) - Number(right.scoreLabel)
      : left[key].localeCompare(right[key]);
    return cmp * dir;
  });
}

/** Client sorter over the D/F worklist. Rows are a pre-sliced prop, not the artifact. */
export default function DataQualityWeakestTable({
  rows,
}: DataQualityWeakestTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [dir, setDir] = useState<1 | -1>(1);
  const sorted = useMemo(() => sortRows(rows, sortKey, dir), [
    rows,
    sortKey,
    dir,
  ]);

  function onSort(next: SortKey) {
    if (next === sortKey) {
      setDir((current) => current === 1 ? -1 : 1);
      return;
    }
    setSortKey(next);
    setDir(1);
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-lacuna-lavender/40 text-xs uppercase tracking-wide text-lacuna-blue/70">
            {([
              ["name", "Company"],
              ["sector", "Sector"],
              ["grade", "Grade"],
              ["score", "Score"],
            ] as const).map(([key, label]) => (
              <th key={key} className="px-2 py-2 font-semibold">
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() =>
                    onSort(key)}
                >
                  {label}
                  {sortKey === key ? (dir === 1 ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
            <th className="px-2 py-2 font-semibold">Why</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              className="border-b border-lacuna-lavender/20 align-top"
            >
              <td className="px-2 py-2 font-medium text-lacuna-plum">
                {row.name}
              </td>
              <td className="px-2 py-2 text-lacuna-blue">{row.sector}</td>
              <td className="px-2 py-2 font-semibold text-lacuna-plum">
                {row.grade}
              </td>
              <td className="px-2 py-2 text-lacuna-blue">{row.scoreLabel}</td>
              <td className="px-2 py-2 text-xs text-lacuna-blue/80">
                {row.sourceDescription}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
