"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { gapScoreForSector } from "@/lib/valuation/burdenCapitalGap";
import { medianBCaCI } from "@/lib/stats/bootstrap";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

/** Minimum n for 80% power to detect d=0.5 at α=0.05 two-tailed ≈ 34 per group. */
const POWER_80_N = 34;

function HoveredCellTooltip({
  cell,
  allCompanies,
}: {
  cell: MatrixCell;
  allCompanies: VerifiedCompanyView[];
}) {
  const valuations = useMemo(() => {
    return allCompanies
      .filter((c) => {
        const cs = (() => {
          if (/Acquired/i.test(c.stage)) return "Acquired";
          if (/Public/i.test(c.stage)) return "Public";
          if (/Series D|Series E|Series F|Late Stage|Pre-IPO/i.test(c.stage)) {
            return "Series D+";
          }
          if (/Series C/i.test(c.stage)) return "Series C";
          if (/Series B/i.test(c.stage)) return "Series B";
          if (/Series A/i.test(c.stage)) return "Series A";
          if (/Seed/i.test(c.stage)) return "Seed";
          return null;
        })();
        return c.sector === cell.sector && cs === cell.stage &&
          typeof c.lastKnownValuation === "number";
      })
      .map((c) => c.lastKnownValuation as number);
  }, [allCompanies, cell]);

  const bca = useMemo(() => {
    if (valuations.length < 3) return null;
    return medianBCaCI(valuations, 0.95, 42);
  }, [valuations]);

  const isPowered = valuations.length >= POWER_80_N;
  const mde = valuations.length >= 2
    ? (() => {
      const m = valuations.reduce((s, v) => s + v, 0) / valuations.length;
      const sd = Math.sqrt(
        valuations.reduce((s, v) => s + (v - m) ** 2, 0) /
          (valuations.length - 1),
      );
      return 2.80 * sd * Math.sqrt(2 / valuations.length);
    })()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-lacuna-surface-muted rounded-lg border border-lacuna-border"
    >
      <h4 className="font-semibold text-lacuna-text-primary">
        {cell.stage} · {cell.sector}
      </h4>
      {cell.medianValuation > 0
        ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-lacuna-text-secondary">
              Median valuation:{" "}
              <span className="font-semibold">${cell.medianValuation}M</span>
              <span className="text-xs text-lacuna-text-muted ml-1">
                ({cell.disclosedCount} disclosed / {cell.totalCount} total)
              </span>
            </p>
            {bca && (
              <p className="text-xs text-lacuna-blue/70">
                95% BCa CI: ${Math.round(bca.lower)}M – ${Math.round(
                  bca.upper,
                )}M
                <span className="ml-1 text-lacuna-text-muted">
                  ({bca.method}, B={bca.B})
                </span>
              </p>
            )}
            {bca === null && valuations.length < 3 && (
              <p className="text-xs text-lacuna-text-muted italic">
                n={valuations.length} — too few observations for BCa CI
              </p>
            )}
          </div>
        )
        : (
          <p className="text-sm text-lacuna-text-muted mt-1 italic">
            No public valuations in this cell
          </p>
        )}
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-lacuna-text-secondary">
        <span>
          Companies: <span className="font-semibold">{cell.totalCount}</span>
        </span>
        {cell.dealCount > 0 && (
          <span>
            Acquisitions:{" "}
            <span className="font-semibold text-pink-600">
              {cell.dealCount}
            </span>
          </span>
        )}
      </div>
      {/* Power warning */}
      {valuations.length > 0 && (
        <div
          className={`mt-2 rounded px-2 py-1 text-xs ${
            isPowered
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isPowered
            ? `Adequately powered (n=${valuations.length} ≥ ${POWER_80_N}) to detect d=0.5 effect at 80% power.`
            : `Underpowered: n=${valuations.length} disclosed. Need n≥${POWER_80_N} for 80% power (d=0.5, α=0.05).${
              mde !== null ? ` MDE at current n: $${Math.round(mde)}M.` : ""
            }`}
        </div>
      )}
    </motion.div>
  );
}

type MomentumLabel = "High" | "Stable" | "Cooling";

type CanonicalStage =
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+"
  | "Public"
  | "Acquired";
const STAGE_ORDER: CanonicalStage[] = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Public",
  "Acquired",
];

const MOMENTUM_CHIP_CLASSES: Record<MomentumLabel, string> = {
  High: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Stable: "bg-amber-50 text-amber-700 border border-amber-200",
  Cooling: "bg-red-50 text-red-700 border border-red-200",
};

function classifyMomentum(
  recentTotal: number,
  priorTotal: number,
): MomentumLabel {
  if (recentTotal === 0 && priorTotal === 0) return "Stable";
  if (priorTotal === 0) return recentTotal > 0 ? "High" : "Stable";

  const ratio = recentTotal / priorTotal;
  if (ratio > 1.2) return "High";
  if (ratio < 0.8) return "Cooling";
  return "Stable";
}

/**
 * Normalize the verified dataset's free-form stage string
 * (e.g. "Private (Series C)", "Public (SPAC 2021)", "Acquired by Ro (2021)")
 * into a canonical bucket for matrix grouping.
 */
function canonicalStage(raw: string): CanonicalStage | null {
  if (/Acquired/i.test(raw)) return "Acquired";
  if (/Public/i.test(raw)) return "Public";
  if (/Series D|Series E|Series F|Late Stage|Pre-IPO/i.test(raw)) {
    return "Series D+";
  }
  if (/Series C/i.test(raw)) return "Series C";
  if (/Series B/i.test(raw)) return "Series B";
  if (/Series A/i.test(raw)) return "Series A";
  if (/Seed/i.test(raw)) return "Seed";
  return null;
}

interface MatrixCell {
  sector: string;
  stage: CanonicalStage;
  medianValuation: number;
  disclosedCount: number;
  totalCount: number;
  dealCount: number;
}

const SECTOR_CHIP_ACTIVE =
  "rounded-full px-3 py-1 text-xs font-medium bg-lacuna-plum text-white";
const SECTOR_CHIP_INACTIVE =
  "rounded-full px-3 py-1 text-xs font-medium bg-lacuna-lavender/20 text-lacuna-plum";

export default function ValuationMatrix() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const [hoveredCell, setHoveredCell] = useState<MatrixCell | null>(null);

  const allSectors = useMemo(
    () => Array.from(new Set(verifiedCompanies.map((c) => c.sector))).sort(),
    [verifiedCompanies],
  );

  const [activeSectors, setActiveSectors] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (allSectors.length > 0 && activeSectors.size === 0) {
      setActiveSectors(new Set(allSectors));
    }
  }, [allSectors, activeSectors.size]);

  const allSectorsActive = allSectors.length > 0 &&
    allSectors.every((sector) => activeSectors.has(sector));

  function selectAll() {
    setActiveSectors(new Set(allSectors));
  }

  function toggleSector(sector: string) {
    let removed = false;
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        if (next.size <= 1) return prev;
        next.delete(sector);
        removed = true;
      } else {
        next.add(sector);
      }
      return next;
    });
    if (removed) {
      setHoveredCell((cell) => (cell?.sector === sector ? null : cell));
    }
  }

  const {
    sectors,
    matrix,
    maxValuation,
    totalDisclosed,
    totalCompanies,
    sectorMomentum,
  } = useMemo(() => {
    const companyById = new Map(
      verifiedCompanies.map((company) => [company.id, company]),
    );
    const visibleSectors = allSectors.filter((sector) =>
      activeSectors.has(sector)
    );
    const sectorDealCounts = verifiedAcquisitions.reduce<
      Record<string, Record<number, number>>
    >((acc, acquisition) => {
      const target = companyById.get(acquisition.targetId);
      if (!target) return acc;

      const year = new Date(acquisition.announcedDate).getFullYear();
      const sectorCounts = acc[target.sector] ?? (acc[target.sector] = {});
      sectorCounts[year] = (sectorCounts[year] ?? 0) + 1;
      return acc;
    }, {});

    const grid: MatrixCell[][] = STAGE_ORDER.map((stage) =>
      visibleSectors.map((sector) => {
        const inCell = verifiedCompanies.filter((c) => {
          const cs = canonicalStage(c.stage);
          return c.sector === sector && cs === stage;
        });
        const withVal = inCell.filter((c) =>
          typeof c.lastKnownValuation === "number"
        );
        const valuations = withVal.map((c) => c.lastKnownValuation as number)
          .sort((a, b) => a - b);
        const median = valuations.length > 0
          ? valuations[Math.floor(valuations.length / 2)]
          : 0;

        const deals = verifiedAcquisitions.filter((a) => {
          const target = companyById.get(a.targetId);
          if (!target) return false;
          return target.sector === sector &&
            canonicalStage(target.stage) === stage;
        });

        return {
          sector,
          stage,
          medianValuation: median,
          disclosedCount: withVal.length,
          totalCount: inCell.length,
          dealCount: deals.length,
        };
      })
    );

    const max = Math.max(1, ...grid.flat().map((c) => c.medianValuation));
    const disclosed = verifiedCompanies.filter((c) =>
      typeof c.lastKnownValuation === "number"
    ).length;
    const momentumBySector = Object.fromEntries(
      visibleSectors.map((sector) => {
        const counts = sectorDealCounts[sector] ?? {};
        const priorTotal = [2019, 2020, 2021].reduce(
          (sum, year) => sum + (counts[year] ?? 0),
          0,
        );
        const recentTotal = [2022, 2023, 2024].reduce(
          (sum, year) => sum + (counts[year] ?? 0),
          0,
        );
        return [sector, classifyMomentum(recentTotal, priorTotal)];
      }),
    ) as Record<string, MomentumLabel>;

    return {
      sectors: visibleSectors,
      matrix: grid,
      maxValuation: max,
      totalDisclosed: disclosed,
      totalCompanies: verifiedCompanies.length,
      sectorMomentum: momentumBySector,
    };
  }, [verifiedCompanies, verifiedAcquisitions, allSectors, activeSectors]);

  const getColor = (value: number) => {
    if (value === 0) return "#f8fafc";
    const intensity = value / maxValuation;
    if (intensity < 0.25) return "#fce7f3";
    if (intensity < 0.5) return "#fbcfe8";
    if (intensity < 0.75) return "#f9a8d4";
    return "#ec4899";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-border p-6">
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-text-primary">
            Valuation Matrix
          </h3>
          <p className="text-sm text-lacuna-text-muted">
            Median disclosed valuation ($M) by sector × normalized stage
          </p>
        </div>
        <span className="text-xs text-lacuna-text-muted px-2 py-1 bg-lacuna-surface-muted rounded">
          {totalDisclosed}/{totalCompanies} companies with public valuations
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className={allSectorsActive
            ? SECTOR_CHIP_ACTIVE
            : SECTOR_CHIP_INACTIVE}
        >
          All
        </button>
        {allSectors.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => toggleSector(sector)}
            className={activeSectors.has(sector)
              ? SECTOR_CHIP_ACTIVE
              : SECTOR_CHIP_INACTIVE}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto mt-4">
        <div className="min-w-[640px]">
          {/* Header row */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `120px repeat(${sectors.length}, 1fr)`,
            }}
          >
            <div className="p-2"></div>
            {sectors.map((sector) => (
              <div
                key={sector}
                className="p-2 text-xs font-medium text-lacuna-text-secondary text-center"
                title={sector}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="max-w-full truncate">{sector}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      MOMENTUM_CHIP_CLASSES[sectorMomentum[sector]]
                    }`}
                  >
                    {sectorMomentum[sector]}
                  </span>
                  {(() => {
                    const gap = gapScoreForSector(sector);
                    if (gap === null) return null;
                    const color = gap >= 65
                      ? "bg-emerald-100 text-emerald-700"
                      : gap >= 35
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600";
                    return (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${color}`}
                        title="Burden-capital gap score (higher = more underfunded vs. disease burden)"
                      >
                        gap {gap.toFixed(0)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {matrix.map((row, rowIndex) => (
            <div
              key={STAGE_ORDER[rowIndex]}
              className="grid"
              style={{
                gridTemplateColumns: `120px repeat(${sectors.length}, 1fr)`,
              }}
            >
              <div className="p-2 text-xs font-medium text-lacuna-text-secondary flex items-center">
                {STAGE_ORDER[rowIndex]}
              </div>
              {row.map((cell, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className="p-1"
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div
                    className="h-12 rounded-md flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                    style={{ backgroundColor: getColor(cell.medianValuation) }}
                    title={cell.totalCount > 0
                      ? `${cell.totalCount} company${
                        cell.totalCount === 1 ? "" : "ies"
                      } · ${cell.disclosedCount} disclosed`
                      : "No companies in this cell"}
                  >
                    {cell.medianValuation > 0 && (
                      <span className="text-xs font-semibold text-lacuna-text-primary">
                        ${cell.medianValuation}M
                      </span>
                    )}
                    {cell.medianValuation === 0 && cell.totalCount > 0 && (
                      <span
                        className="text-xs text-lacuna-text-muted"
                        title="Companies present, no public valuations"
                      >
                        ·{cell.totalCount}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4">
        <span className="text-xs text-lacuna-text-muted">Lower median</span>
        <div className="flex gap-1">
          {["#fce7f3", "#fbcfe8", "#f9a8d4", "#ec4899"].map((color, i) => (
            <div
              key={i}
              className="w-8 h-4 rounded"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-xs text-lacuna-text-muted">Higher median</span>
      </div>

      {/* Tooltip */}
      {hoveredCell && hoveredCell.totalCount > 0 && (
        <HoveredCellTooltip
          cell={hoveredCell}
          allCompanies={verifiedCompanies}
        />
      )}

      <p className="mt-4 text-xs text-lacuna-text-muted leading-relaxed">
        Empty cells reflect honest gaps in the verified dataset — not low
        activity. Medians shown only where ≥1 company has a disclosed valuation.
      </p>
    </div>
  );
}
