'use client';

import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

function countDisclosedDealValues(acquisitions: { dealValue?: number }[]) {
  let disclosed = 0;
  let undisclosed = 0;
  for (const d of acquisitions) {
    if (typeof d.dealValue === 'number') disclosed += 1;
    else undisclosed += 1;
  }
  return { disclosed, undisclosed };
}

function formatDate(iso: string) {
  // keep this intentionally simple and locale-safe for a static demo
  return iso;
}

export default function DataCoverageCard() {
  const { dataProvenance, verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const { disclosed, undisclosed } = countDisclosedDealValues(verifiedAcquisitions);
  const lastUpdated = dataProvenance.lastUpdated ? formatDate(dataProvenance.lastUpdated) : '—';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Data coverage</h3>
          <p className="text-sm text-slate-500">
            Transparent about what’s verified, disclosed, and missing.
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

      <div className="mt-5">
        <p className="text-xs font-medium text-slate-600 mb-2">Sources</p>
        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-5">
          {dataProvenance.sources.slice(0, 5).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {dataProvenance.sources.length > 5 ? (
          <p className="text-[11px] text-slate-400 mt-2">
            +{dataProvenance.sources.length - 5} more sources in dataset provenance.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs text-slate-500">
          {dataProvenance.disclaimer}
        </p>
        <a
          href="/api/export/deals.csv"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Download deals CSV
        </a>
      </div>
    </div>
  );
}

