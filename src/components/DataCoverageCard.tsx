'use client';

import { useMemo } from 'react';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';
import {
  computeDisclosureStats,
  computeEffectiveNBadges,
  computeSectorDealCounts,
  computeYearDealCounts,
  type EffectiveNBadges,
} from '@/lib/data/datasetCoverageStats';

function countDisclosedDealValues(acquisitions: { dealValue?: number }[]) {
  let disclosed = 0;
  let undisclosed = 0;
  for (const d of acquisitions) {
    if (typeof d.dealValue === 'number') disclosed += 1;
    else undisclosed += 1;
  }
  return { disclosed, undisclosed };
}

const tierStyles: Record<EffectiveNBadges['network']['tier'], string> = {
  insufficient: 'bg-red-50 text-red-700 border-red-200',
  low: 'bg-amber-50 text-amber-800 border-amber-200',
  medium: 'bg-sky-50 text-sky-800 border-sky-200',
  high: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

function EffectiveNBadge({
  title,
  badge,
}: {
  title: string;
  badge: EffectiveNBadges[keyof EffectiveNBadges];
}) {
  return (
    <div className={`rounded-lg border p-3 ${tierStyles[badge.tier]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{title}</p>
      <p className="text-sm font-semibold mt-1">{badge.label}</p>
      <p className="text-[11px] mt-1 capitalize">Power: {badge.tier.replace('_', ' ')}</p>
    </div>
  );
}

export default function DataCoverageCard() {
  const {
    dataProvenance,
    verifiedCompanies,
    verifiedAcquisitions,
    verifiedAcquirers,
  } = useVerifiedDataset();
  const { disclosed, undisclosed } = countDisclosedDealValues(verifiedAcquisitions);
  const lastUpdated = dataProvenance.lastUpdated || '—';

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
  const sectorCounts = useMemo(() => computeSectorDealCounts(coverageInput), [coverageInput]);
  const yearCounts = useMemo(() => computeYearDealCounts(coverageInput), [coverageInput]);
  const effectiveN = useMemo(() => computeEffectiveNBadges(coverageInput), [coverageInput]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">M&A Data Coverage &amp; Provenance</h3>
          <p className="text-sm text-slate-500">
            Verified women&apos;s health deal sample size, price disclosure rates, and statistical power per analytic module.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          Updated {lastUpdated}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{verifiedCompanies.length}</p>
          <p className="text-xs text-slate-500 mt-1">Companies</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{verifiedAcquisitions.length}</p>
          <p className="text-xs text-slate-500 mt-1">Deals</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{disclosed}</p>
          <p className="text-xs text-slate-500 mt-1">Disclosed price</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{undisclosed}</p>
          <p className="text-xs text-slate-500 mt-1">Undisclosed price</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
          <span className="text-slate-500">Valuation coverage</span>
          <p className="font-semibold text-slate-800 mt-0.5">
            {stats.companiesWithValuation}/{stats.companiesTotal} companies (
            {(stats.valuationRate * 100).toFixed(0)}%)
          </p>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
          <span className="text-slate-500">Price disclosure rate</span>
          <p className="font-semibold text-slate-800 mt-0.5">
            {(stats.disclosureRate * 100).toFixed(0)}% ({stats.dealsWithValueNote} with notes)
          </p>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
          <span className="text-slate-500">Deal years</span>
          <p className="font-semibold text-slate-800 mt-0.5">
            {yearCounts.length > 0
              ? `${yearCounts[0].year}–${yearCounts[yearCounts.length - 1].year}`
              : '—'}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
          <span className="text-slate-500">Sectors tracked</span>
          <p className="font-semibold text-slate-800 mt-0.5">{sectorCounts.length}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-600 mb-2">Effective n by module</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <EffectiveNBadge title="Network analysis" badge={effectiveN.network} />
          <EffectiveNBadge title="Competitive analysis" badge={effectiveN.competitive} />
          <EffectiveNBadge title="Price analytics" badge={effectiveN.priceAnalytics} />
          <EffectiveNBadge title="Deal velocity" badge={effectiveN.dealVelocity} />
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Deals by sector (target)</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-2 font-medium">Sector</th>
                  <th className="text-right p-2 font-medium">Cos.</th>
                  <th className="text-right p-2 font-medium">Deals</th>
                  <th className="text-right p-2 font-medium">$ discl.</th>
                </tr>
              </thead>
              <tbody>
                {sectorCounts.map((row) => (
                  <tr key={row.sector} className="border-t border-slate-100">
                    <td className="p-2 text-slate-700">{row.sector}</td>
                    <td className="p-2 text-right text-slate-600">{row.companies}</td>
                    <td className="p-2 text-right text-slate-600">{row.deals}</td>
                    <td className="p-2 text-right text-slate-600">{row.disclosedPrices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Deals by announcement year</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-2 font-medium">Year</th>
                  <th className="text-right p-2 font-medium">Deals</th>
                  <th className="text-right p-2 font-medium">$ discl.</th>
                </tr>
              </thead>
              <tbody>
                {yearCounts.map((row) => (
                  <tr key={row.year} className="border-t border-slate-100">
                    <td className="p-2 text-slate-700">{row.year}</td>
                    <td className="p-2 text-right text-slate-600">{row.count}</td>
                    <td className="p-2 text-right text-slate-600">{row.disclosedPrices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-slate-600 mb-2">Global source categories</p>
        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-5">
          {dataProvenance.sources.slice(0, 5).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {dataProvenance.sources.length > 5 ? (
          <p className="text-[11px] text-slate-400 mt-2">
            +{dataProvenance.sources.length - 5} more in dataset provenance.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs text-slate-500">{dataProvenance.disclaimer}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export/deals.csv"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Download deals CSV
          </a>
          <a
            href="/api/dataset/verified"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Dataset JSON
          </a>
        </div>
      </div>
    </div>
  );
}
