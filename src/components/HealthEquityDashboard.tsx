'use client';

import { useMemo } from 'react';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';
import { EPIDEMIOLOGY_DATABASE } from '@/lib/impact/oaisCalculator';
import {
  HEALTH_EQUITY_FOCUS_AREAS,
  type HealthEquityDataTier,
  type HealthEquityFocusArea,
} from '@/lib/impact/healthEquityFocusAreas';

const tierBadgeStyles: Record<HealthEquityDataTier, string> = {
  cited_epidemiology: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  illustrative_static: 'bg-amber-50 text-amber-900 border-amber-200',
};

const tierLabels: Record<HealthEquityDataTier, string> = {
  cited_epidemiology: 'Cited epidemiology (static)',
  illustrative_static: 'Illustrative context only',
};

interface FocusAreaView extends HealthEquityFocusArea {
  verifiedCompanies: Array<{ id: string; name: string; sector: string; stage: string }>;
  addressablePopulation?: string;
}

function formatPopulation(condition: string): string | undefined {
  const row = EPIDEMIOLOGY_DATABASE.find((e) => e.condition === condition);
  if (!row) return undefined;
  const { pointEstimate, lowerBound, upperBound } = row.addressablePopulation;
  return `${pointEstimate}M US women (${lowerBound}–${upperBound}M, ${row.year})`;
}

function FocusAreaCard({ area }: { area: FocusAreaView }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-800">{area.title}</h4>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${tierBadgeStyles[area.dataTier]}`}
        >
          {tierLabels[area.dataTier]}
        </span>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{area.summary}</p>

      <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
        <p className="text-slate-500">Disparity / prevalence (static)</p>
        <p className="font-medium text-slate-800 mt-0.5">{area.disparityLabel}</p>
        {area.addressablePopulation ? (
          <p className="text-slate-600 mt-1">Addressable population: {area.addressablePopulation}</p>
        ) : null}
        <p className="text-slate-500 mt-2">Source: {area.source}</p>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-600 mb-2">
          Verified portfolio overlap ({area.relatedSectors.join(', ')})
        </p>
        {area.verifiedCompanies.length > 0 ? (
          <ul className="text-sm text-slate-700 space-y-1">
            {area.verifiedCompanies.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>
                <span className="text-slate-500"> · {c.sector} · {c.stage}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No companies in the verified sample for these sectors yet.
          </p>
        )}
      </div>
    </article>
  );
}

export default function HealthEquityDashboard() {
  const { verifiedCompanies, verifiedAcquisitions, dataProvenance } = useVerifiedDataset();
  const lastUpdated = dataProvenance.lastUpdated || '—';

  const focusAreas = useMemo((): FocusAreaView[] => {
    return HEALTH_EQUITY_FOCUS_AREAS.map((area) => {
      const verifiedInSectors = verifiedCompanies
        .filter((c) => area.relatedSectors.includes(c.sector))
        .map((c) => ({ id: c.id, name: c.name, sector: c.sector, stage: c.stage }));

      return {
        ...area,
        verifiedCompanies: verifiedInSectors,
        addressablePopulation: area.epidemiologyCondition
          ? formatPopulation(area.epidemiologyCondition)
          : undefined,
      };
    });
  }, [verifiedCompanies]);

  const portfolioStats = useMemo(() => {
    const sectorSet = new Set(HEALTH_EQUITY_FOCUS_AREAS.flatMap((a) => [...a.relatedSectors]));
    const companiesInScope = verifiedCompanies.filter((c) => sectorSet.has(c.sector));
    const companyIds = new Set(companiesInScope.map((c) => c.id));
    const dealsInScope = verifiedAcquisitions.filter((d) => companyIds.has(d.targetId));
    const areasWithPortfolio = focusAreas.filter((a) => a.verifiedCompanies.length > 0).length;

    return {
      companiesInScope: companiesInScope.length,
      dealsInScope: dealsInScope.length,
      areasWithPortfolio,
      areaCount: focusAreas.length,
    };
  }, [verifiedCompanies, verifiedAcquisitions, focusAreas]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Health equity context</h3>
          <p className="text-sm text-slate-500 mt-1">
            Public-health framing with cited static epidemiology, mapped to companies actually in the
            verified sample — not live CDC or trial data.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 shrink-0">
          Dataset {lastUpdated}
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800">What this section shows</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc pl-5">
          <li>
            <strong>Cited epidemiology</strong> — fixed citations from the OAIS reference list (same
            numbers as Impact Assessment, not refreshed from APIs).
          </li>
          <li>
            <strong>Verified portfolio overlap</strong> — which sample companies sit in related
            sectors; empty means a gap in the curated dataset, not proof of no market activity.
          </li>
          <li>
            This demo does <strong>not</strong> compute dual-metric ROI scores or diversity metrics
            here — see Impact Assessment and Fairness Audit for those modules.
          </li>
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{portfolioStats.areaCount}</p>
          <p className="text-xs text-slate-500 mt-1">Focus areas</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{portfolioStats.companiesInScope}</p>
          <p className="text-xs text-slate-500 mt-1">Sample cos. in related sectors</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{portfolioStats.dealsInScope}</p>
          <p className="text-xs text-slate-500 mt-1">Verified deals (those targets)</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-2xl font-bold text-slate-800">{portfolioStats.areasWithPortfolio}</p>
          <p className="text-xs text-slate-500 mt-1">Areas with ≥1 sample company</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {focusAreas.map((area) => (
          <FocusAreaCard key={area.id} area={area} />
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-2 font-medium">Focus area</th>
              <th className="text-left p-2 font-medium">Data tier</th>
              <th className="text-right p-2 font-medium">Sample cos.</th>
              <th className="text-left p-2 font-medium hidden sm:table-cell">Source</th>
            </tr>
          </thead>
          <tbody>
            {focusAreas.map((area) => (
              <tr key={area.id} className="border-t border-slate-100">
                <td className="p-2 text-slate-700">{area.title}</td>
                <td className="p-2 text-slate-600">{tierLabels[area.dataTier]}</td>
                <td className="p-2 text-right text-slate-600">{area.verifiedCompanies.length}</td>
                <td className="p-2 text-slate-500 hidden sm:table-cell truncate max-w-[220px]">
                  {area.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs text-slate-500">{dataProvenance.disclaimer}</p>
        <a
          href="#impact-assessment"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Open Impact Assessment (OAIS)
        </a>
      </div>
    </div>
  );
}
