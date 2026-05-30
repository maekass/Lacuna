/**
 * Post-Acquisition Validation Tracker
 *
 * Lists verified acquisitions only. Post-acquisition outcome metrics (patient
 * volume, scaling, OAIS calibration) are not in the verified public dataset.
 */

'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

interface VerifiedDealRow {
  company: string;
  acquirer: string;
  acquisitionDate: string;
  dealValue?: number;
  dealValueNote?: string;
  source: string;
  strategicRationale: string;
}

export default function ValidationTracker() {
  const { verifiedAcquisitions } = useVerifiedDataset();
  const validationRows = useMemo<VerifiedDealRow[]>(
    () =>
      verifiedAcquisitions.map((d) => ({
        company: d.targetName,
        acquirer: d.acquirerName,
        acquisitionDate: d.announcedDate.slice(0, 7),
        dealValue: d.dealValue,
        dealValueNote: d.dealValueNote,
        source: d.source,
        strategicRationale: d.strategicRationale,
      })),
    [verifiedAcquisitions],
  );

  const [selectedYear, setSelectedYear] = useState<string>('all');

  const filteredData =
    selectedYear === 'all'
      ? validationRows
      : validationRows.filter((v) => v.acquisitionDate.startsWith(selectedYear));

  const disclosedValueCount = filteredData.filter((v) => typeof v.dealValue === 'number').length;
  const disclosureRate =
    filteredData.length > 0 ? (disclosedValueCount / filteredData.length) * 100 : 0;

  const years = useMemo(() => {
    const set = new Set(validationRows.map((v) => v.acquisitionDate.slice(0, 4)));
    return ['all', ...Array.from(set).sort()];
  }, [validationRows]);

  if (validationRows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
        No verified acquisitions in the current dataset.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="border-b border-gray-200 pb-4">
        <h3
          className="text-2xl font-light tracking-tight"
          style={{ fontFamily: "'Bodoni MT', Didot, serif", textTransform: 'uppercase' }}
        >
          Verified Acquisition Tracker
        </h3>
        <p
          className="text-sm tracking-widest text-gray-500 mt-1"
          style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}
        >
          Public deal records only — no synthetic post-acquisition outcomes
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        Pre-acquisition OAIS scores, scaling multipliers, and post-close patient volumes are{' '}
        <strong>not</strong> in the verified dataset. This view shows only disclosed deal facts
        (dates, values where public, sources, rationale).
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div
            className="text-2xl font-light"
            style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}
          >
            {filteredData.length}
          </div>
          <div
            className="text-xs text-gray-500 uppercase"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            Verified acquisitions
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div
            className="text-2xl font-light"
            style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}
          >
            {disclosureRate.toFixed(0)}%
          </div>
          <div
            className="text-xs text-gray-500 uppercase"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            Deal value disclosed
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div
            className="text-2xl font-light"
            style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#E8B4B8' }}
          >
            0
          </div>
          <div
            className="text-xs text-gray-500 uppercase"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            Post-close outcome panel
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedYear === year
                ? 'bg-[#5D4E6D] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            {year === 'all' ? 'All Years' : year}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              <th className="text-left p-3">Target</th>
              <th className="text-left p-3">Acquirer</th>
              <th className="text-left p-3">Announced</th>
              <th className="text-right p-3">Deal value ($M)</th>
              <th className="text-left p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((v) => (
              <tr key={`${v.company}-${v.acquisitionDate}`} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium">{v.company}</td>
                <td className="p-3 text-gray-600">{v.acquirer}</td>
                <td className="p-3 text-gray-600">{v.acquisitionDate}</td>
                <td className="p-3 text-right">
                  {typeof v.dealValue === 'number' ? v.dealValue.toLocaleString() : 'Undisclosed'}
                </td>
                <td className="p-3 text-gray-600 text-xs">{v.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        {filteredData.map((v) => (
          <div
            key={`detail-${v.company}-${v.acquisitionDate}`}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <h4 className="font-medium text-lg" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {v.company} → {v.acquirer}
            </h4>
            <p className="text-sm text-gray-500 mt-1">Announced: {v.acquisitionDate}</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Deal value: </span>
                <span className="font-medium">
                  {typeof v.dealValue === 'number'
                    ? `$${v.dealValue.toLocaleString()}M`
                    : 'Not disclosed'}
                </span>
                {v.dealValueNote ? (
                  <p className="text-xs text-gray-500 mt-1">{v.dealValueNote}</p>
                ) : null}
              </div>
              <div>
                <span className="text-gray-500">Source: </span>
                <span>{v.source}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-700">{v.strategicRationale}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
