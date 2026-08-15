"use client";

import { useMemo, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import ValuationMatrixGrid from "@/components/ValuationMatrixGrid";
import type { ValuationMatrixCellData } from "@/components/ValuationMatrixCell";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { TracedValue } from "@/lib/lineage";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";
import {
  buildValuationMatrixEstimate,
  type CanonicalStage,
  canonicalStage,
} from "@/lib/valuation/valuationMatrix";

type MomentumLabel = "High" | "Stable" | "Cooling";

const STAGE_ORDER: CanonicalStage[] = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Public",
  "Acquired",
];
const CHIP_ACTIVE =
  "rounded-full px-3 py-1 text-xs font-medium bg-lacuna-plum text-white";
const CHIP_INACTIVE =
  "rounded-full px-3 py-1 text-xs font-medium bg-lacuna-lavender/20 text-lacuna-plum";
function hasValuation(
  company: VerifiedCompanyView,
): company is VerifiedCompanyView & { readonly lastKnownValuation: number } {
  return typeof company.lastKnownValuation === "number";
}

function classifyMomentum(recent: number, prior: number): MomentumLabel {
  if (recent === 0 && prior === 0) return "Stable";
  if (prior === 0) return recent > 0 ? "High" : "Stable";
  const ratio = recent / prior;
  return ratio > 1.2 ? "High" : ratio < 0.8 ? "Cooling" : "Stable";
}

export default function ValuationMatrix() {
  const {
    verifiedCompanies,
    verifiedAcquisitions,
    dataProvenance,
  } = useVerifiedDataset();
  const [activeSectors, setActiveSectors] = useState<Set<string> | null>(null);
  const allSectors = useMemo(
    () =>
      Array.from(new Set(verifiedCompanies.map((company) => company.sector)))
        .sort(),
    [verifiedCompanies],
  );
  const selectedSectors = useMemo(
    () => activeSectors ?? new Set(allSectors),
    [activeSectors, allSectors],
  );
  const sectors = allSectors.filter((sector) => selectedSectors.has(sector));

  const { matrix, maxValuation, totalDisclosed, dealCounts } = useMemo(() => {
    const byId = new Map(
      verifiedCompanies.map((company) => [company.id, company]),
    );
    const dealCounts = verifiedAcquisitions.reduce<
      Record<string, Record<number, number>>
    >(
      (counts, deal) => {
        const target = byId.get(deal.targetId);
        if (!target) return counts;
        const year = new Date(deal.announcedDate).getFullYear();
        const sectorCounts = counts[target.sector] ??
          (counts[target.sector] = {});
        sectorCounts[year] = (sectorCounts[year] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const matrix: ValuationMatrixCellData[][] = STAGE_ORDER.map((stage) =>
      sectors.map((sector) => {
        const cellCompanies = verifiedCompanies.filter(
          (company) =>
            company.sector === sector &&
            canonicalStage(company.stage) === stage,
        );
        const { estimate, valuations } = buildValuationMatrixEstimate(
          verifiedCompanies,
          sector,
          stage,
          {
            datasetVersion: dataProvenance.datasetVersion,
            datasetHash: dataProvenance.datasetHash,
          },
        );
        const dealCount = verifiedAcquisitions.filter((deal) => {
          const target = byId.get(deal.targetId);
          return target !== undefined &&
            target.sector === sector &&
            canonicalStage(target.stage) === stage;
        }).length;
        return {
          sector,
          stage,
          estimate,
          valuations,
          totalCount: cellCompanies.length,
          dealCount,
        };
      })
    );
    const values = matrix.flat()
      .map((cell) => cell.estimate)
      .filter((
        estimate,
      ): estimate is Extract<TracedValue, { kind: "sufficient" }> =>
        estimate.kind === "sufficient"
      )
      .map((estimate) => estimate.value);
    return {
      matrix,
      maxValuation: Math.max(1, ...values),
      totalDisclosed: verifiedCompanies.filter(hasValuation).length,
      dealCounts,
    };
  }, [
    dataProvenance.datasetVersion,
    dataProvenance.datasetHash,
    sectors,
    verifiedCompanies,
    verifiedAcquisitions,
  ]);

  const momentum = useMemo(
    () =>
      Object.fromEntries(sectors.map((sector) => {
        const counts = dealCounts[sector] ?? {};
        const prior = [2019, 2020, 2021].reduce(
          (sum, year) => sum + (counts[year] ?? 0),
          0,
        );
        const recent = [2022, 2023, 2024].reduce(
          (sum, year) => sum + (counts[year] ?? 0),
          0,
        );
        return [sector, classifyMomentum(recent, prior)];
      })) as Record<string, MomentumLabel>,
    [dealCounts, sectors],
  );

  return (
    <div className="rounded-xl border border-lacuna-border bg-white p-6 shadow-sm">
      <CuratedDatasetBanner className="mb-4" />
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-text-primary">
            Valuation Matrix
          </h3>
          <p className="text-sm text-lacuna-text-muted">
            Median disclosed valuation ($M) by sector × normalized stage
          </p>
        </div>
        <span className="rounded bg-lacuna-surface-muted px-2 py-1 text-xs text-lacuna-text-muted">
          {totalDisclosed}/{verifiedCompanies.length}{" "}
          companies with public valuations
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSectors(new Set(allSectors))}
          className={sectors.length === allSectors.length
            ? CHIP_ACTIVE
            : CHIP_INACTIVE}
        >
          All
        </button>
        {allSectors.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() =>
              setActiveSectors((previous) => {
                const next = new Set(previous ?? allSectors);
                if (next.has(sector) && next.size > 1) next.delete(sector);
                else next.add(sector);
                return next;
              })}
            className={selectedSectors.has(sector)
              ? CHIP_ACTIVE
              : CHIP_INACTIVE}
          >
            {sector}
          </button>
        ))}
      </div>
      <ValuationMatrixGrid
        matrix={matrix}
        sectors={sectors}
        stageOrder={STAGE_ORDER}
        maxValuation={maxValuation}
        momentum={momentum}
      />
      <div className="mt-6 flex items-center gap-4">
        <span className="text-xs text-lacuna-text-muted">Lower median</span>
        <div className="flex gap-1">
          {["#fce7f3", "#fbcfe8", "#f9a8d4", "#ec4899"].map((color) => (
            <div
              key={color}
              className="h-4 w-8 rounded"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-xs text-lacuna-text-muted">Higher median</span>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-lacuna-text-muted">
        Empty cells reflect honest gaps in the verified dataset. Cells below the
        minimum sample are explained absences.
      </p>
    </div>
  );
}
