"use client";

import { useMemo } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  CoverageRateTiles,
  CoverageStatBox,
  EffectiveNBadge,
} from "@/components/DataCoverageStatBoxes";
import DisclosedEstimandNote from "@/components/DisclosedEstimandNote";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  computeDisclosureStats,
  computeEffectiveNBadges,
  computeSectorDealCounts,
  computeYearDealCounts,
  COVERAGE_STAT_MODELS,
} from "@/lib/data/datasetCoverageStats";

function countDisclosedDealValues(acquisitions: { dealValue?: number }[]) {
  let disclosed = 0;
  let undisclosed = 0;
  for (const d of acquisitions) {
    if (typeof d.dealValue === "number") disclosed += 1;
    else undisclosed += 1;
  }
  return { disclosed, undisclosed };
}

export default function DataCoverageCard() {
  const {
    dataProvenance,
    verifiedCompanies,
    verifiedAcquisitions,
    verifiedAcquirers,
  } = useVerifiedDataset();
  const { disclosed, undisclosed } = countDisclosedDealValues(
    verifiedAcquisitions,
  );
  const lastUpdated = dataProvenance.lastUpdated || "—";

  const coverageInput = useMemo(
    () => ({
      companies: verifiedCompanies,
      acquisitions: verifiedAcquisitions,
      acquirers: verifiedAcquirers,
    }),
    [verifiedCompanies, verifiedAcquisitions, verifiedAcquirers],
  );

  const stats = useMemo(
    () => computeDisclosureStats(coverageInput),
    [coverageInput],
  );
  const sectorCounts = useMemo(() => computeSectorDealCounts(coverageInput), [
    coverageInput,
  ]);
  const sectorsWithDeals = useMemo(
    () => sectorCounts.filter((row) => row.deals > 0),
    [sectorCounts],
  );
  const zeroDealSectorCount = sectorCounts.length - sectorsWithDeals.length;
  const yearCounts = useMemo(() => computeYearDealCounts(coverageInput), [
    coverageInput,
  ]);
  const effectiveN = useMemo(() => computeEffectiveNBadges(coverageInput), [
    coverageInput,
  ]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-6">
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            What Our Data Covers
          </h3>
          <p className="text-sm text-lacuna-blue">
            Here&apos;s an honest look at our dataset — how many deals
            we&apos;ve verified, what&apos;s disclosed, and where our analysis
            is strongest.
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium bg-lacuna-lavender/20 text-lacuna-plum">
          Updated {lastUpdated}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <CoverageStatBox
          value={verifiedCompanies.length}
          label="Companies"
          model={COVERAGE_STAT_MODELS.companies}
        />
        <CoverageStatBox
          value={verifiedAcquisitions.length}
          label="Deals"
          model={COVERAGE_STAT_MODELS.deals}
        />
        <CoverageStatBox
          value={disclosed}
          label="Disclosed price"
          model={COVERAGE_STAT_MODELS.disclosedPrice}
        />
        <CoverageStatBox
          value={undisclosed}
          label="Undisclosed price"
          model={COVERAGE_STAT_MODELS.undisclosedPrice}
        />
      </div>

      <DisclosedEstimandNote />

      <CoverageRateTiles
        stats={stats}
        yearRange={yearCounts.length > 0
          ? `${yearCounts[0].year}–${yearCounts[yearCounts.length - 1].year}`
          : "—"}
        sectorsWithDeals={sectorsWithDeals.length}
      />

      <div className="mt-6">
        <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
          Effective n by module
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <EffectiveNBadge
            title="Network analysis"
            badge={effectiveN.network}
          />
          <EffectiveNBadge
            title="Competitive analysis"
            badge={effectiveN.competitive}
          />
          <EffectiveNBadge
            title="Price analytics"
            badge={effectiveN.priceAnalytics}
          />
          <EffectiveNBadge
            title="Deal velocity"
            badge={effectiveN.dealVelocity}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
            Deals by sector (target)
          </p>
          <div className="overflow-x-auto rounded-lg border border-lacuna-lavender/40">
            <table className="w-full text-xs">
              <thead className="bg-lacuna-pink/10 text-lacuna-blue">
                <tr>
                  <th className="text-left p-2 font-medium">Sector</th>
                  <th className="text-right p-2 font-medium">Cos.</th>
                  <th className="text-right p-2 font-medium">Deals</th>
                  <th className="text-right p-2 font-medium">$ discl.</th>
                </tr>
              </thead>
              <tbody>
                {sectorsWithDeals.map((row) => (
                  <tr
                    key={row.sector}
                    className="border-t border-lacuna-lavender/30"
                  >
                    <td className="p-2 text-lacuna-plum">{row.sector}</td>
                    <td className="p-2 text-right text-lacuna-text-secondary">
                      {row.companies}
                    </td>
                    <td className="p-2 text-right text-lacuna-text-secondary">
                      {row.deals}
                    </td>
                    <td className="p-2 text-right text-lacuna-text-secondary">
                      {row.disclosedPrices}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {zeroDealSectorCount > 0
            ? (
              <p className="mt-2 text-[11px] italic text-lacuna-blue/70">
                {zeroDealSectorCount} sector
                {zeroDealSectorCount === 1 ? "" : "s"}{" "}
                with companies but no verified deals omitted.
              </p>
            )
            : null}
        </div>

        <div>
          <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
            Deals by announcement year
          </p>
          <div className="overflow-x-auto rounded-lg border border-lacuna-lavender/40">
            <table className="w-full text-xs">
              <thead className="bg-lacuna-pink/10 text-lacuna-blue">
                <tr>
                  <th className="text-left p-2 font-medium">Year</th>
                  <th className="text-right p-2 font-medium">Deals</th>
                  <th className="text-right p-2 font-medium">$ discl.</th>
                </tr>
              </thead>
              <tbody>
                {yearCounts.map((row) => (
                  <tr
                    key={row.year}
                    className="border-t border-lacuna-lavender/30"
                  >
                    <td className="p-2 text-lacuna-plum">{row.year}</td>
                    <td className="p-2 text-right text-lacuna-text-secondary">
                      {row.count}
                    </td>
                    <td className="p-2 text-right text-lacuna-text-secondary">
                      {row.disclosedPrices}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
          Global source categories
        </p>
        <ul className="text-xs text-lacuna-blue space-y-1 list-disc pl-5">
          {dataProvenance.sources.slice(0, 5).map((s) => <li key={s}>{s}</li>)}
        </ul>
        {dataProvenance.sources.length > 5
          ? (
            <p className="text-[11px] text-lacuna-text-muted mt-2">
              +{dataProvenance.sources.length - 5} more in dataset provenance.
            </p>
          )
          : null}
      </div>

      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs text-lacuna-blue">{dataProvenance.disclaimer}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export/deals.csv"
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-lavender/40 bg-white px-3 py-2 text-xs font-medium text-lacuna-plum hover:bg-lacuna-pink/10"
          >
            Download deals CSV
          </a>
          <a
            href="/api/dataset/verified"
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-lavender/40 bg-white px-3 py-2 text-xs font-medium text-lacuna-plum hover:bg-lacuna-pink/10"
          >
            Dataset JSON
          </a>
        </div>
      </div>
    </div>
  );
}
