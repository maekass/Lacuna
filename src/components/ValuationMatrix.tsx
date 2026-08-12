"use client";

import { useMemo, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import ValuationMatrixGrid from "@/components/ValuationMatrixGrid";
import type { ValuationMatrixCellData } from "@/components/ValuationMatrixCell";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { fromRecords, type TracedValue } from "@/lib/lineage";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

type CanonicalStage =
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+"
  | "Public"
  | "Acquired";
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
const METRIC_ID = "valuation.matrix.median";
const CHIP_ACTIVE =
  "rounded-full px-3 py-1 text-xs font-medium bg-lacuna-plum text-white";
const CHIP_INACTIVE =
  "rounded-full px-3 py-1 text-xs font-medium bg-lacuna-lavender/20 text-lacuna-plum";
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

function hasValuation(
  company: VerifiedCompanyView,
): company is VerifiedCompanyView & { readonly lastKnownValuation: number } {
  return typeof company.lastKnownValuation === "number";
}

function buildCellEstimate(
  companies: readonly VerifiedCompanyView[],
  sector: string,
  stage: CanonicalStage,
  datasetVersion?: string,
): { estimate: TracedValue; valuations: readonly number[] } {
  const collection = fromRecords("companies", companies, { datasetVersion })
    .exclude((company) => company.sector !== sector, "out_of_sector")
    .exclude(
      (company) => canonicalStage(company.stage) !== stage,
      "out_of_stage",
    )
    .exclude(
      (company) => !hasValuation(company),
      "valuation_undisclosed",
      "lastKnownValuation",
    );
  const valuations = collection.records
    .map((record) => record.value)
    .filter(hasValuation)
    .map((company) => company.lastKnownValuation);
  return {
    estimate: collection
      .map((company) => hasValuation(company) ? company.lastKnownValuation : 0)
      .estimate(METRIC_ID),
    valuations,
  };
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
        const { estimate, valuations } = buildCellEstimate(
          verifiedCompanies,
          sector,
          stage,
          dataProvenance.datasetVersion,
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
