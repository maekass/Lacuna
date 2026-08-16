"use client";

import { motion } from "framer-motion";
import ValuationMatrixCell, {
  type ValuationMatrixCellData,
} from "@/components/ValuationMatrixCell";

function colorFor(cell: ValuationMatrixCellData, max: number): string {
  if (cell.estimate.kind === "insufficient") return "#f8fafc";
  const intensity = cell.estimate.value / max;
  if (intensity < 0.25) return "#fce7f3";
  if (intensity < 0.5) return "#fbcfe8";
  if (intensity < 0.75) return "#f9a8d4";
  return "#ec4899";
}

export default function ValuationMatrixGrid({
  matrix,
  sectors,
  stageOrder,
  maxValuation,
  momentum,
}: {
  readonly matrix: readonly ValuationMatrixCellData[][];
  readonly sectors: readonly string[];
  readonly stageOrder: readonly string[];
  readonly maxValuation: number;
  readonly momentum: Readonly<Record<string, string>>;
}) {
  return (
    <div className="mt-4 overflow-x-auto px-4 sm:px-0">
      <div className="min-w-[680px]">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `120px repeat(${sectors.length}, 1fr)`,
          }}
        >
          <div />
          {sectors.map((sector) => (
            <div
              key={sector}
              className="p-2 text-center text-xs font-medium text-lacuna-text-secondary"
            >
              <span className="block truncate">{sector}</span>
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                {momentum[sector]}
              </span>
            </div>
          ))}
        </div>
        {matrix.map((row, rowIndex) => (
          <div
            key={stageOrder[rowIndex]}
            className="grid"
            style={{
              gridTemplateColumns: `120px repeat(${sectors.length}, 1fr)`,
            }}
          >
            <div className="flex items-center p-2 text-xs font-medium text-lacuna-text-secondary">
              {stageOrder[rowIndex]}
            </div>
            {row.map((cell) => (
              <motion.div key={`${cell.stage}:${cell.sector}`} className="p-1">
                <div
                  className="flex h-12 items-center justify-center rounded-md transition-all hover:scale-105 hover:shadow-md"
                  style={{ backgroundColor: colorFor(cell, maxValuation) }}
                  title={cell.totalCount > 0
                    ? `${cell.totalCount} compan${
                      cell.totalCount === 1 ? "y" : "ies"
                    } · ${cell.valuations.length} disclosed`
                    : "No companies in this cell"}
                >
                  {cell.totalCount > 0 && <ValuationMatrixCell cell={cell} />}
                </div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
