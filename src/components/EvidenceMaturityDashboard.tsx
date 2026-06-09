'use client';

import { useState, useMemo, useReducer } from 'react';
import CuratedDatasetBanner from '@/components/CuratedDatasetBanner';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';
import {
  computeEvidenceMaturity,
  type EvidenceInputs,
  type EvidenceScore,
} from '@/lib/evidence/evidenceMaturityCalculator';
import {
  computeValuationCorrelation,
  type CompanyEvidence,
  type CorrelationResult,
} from '@/lib/evidence/valuationCorrelation';
import { isGenomicsRelevantCompany } from '@/lib/data/genomicsFilters';

/* ─── types ─── */
interface CompanyRow {
  id: string;
  name: string;
  sector: string;
  dealValue: number | undefined;
  dealDate: string;
  acquirerName: string;
  evidence: EvidenceScore;
  inputs: EvidenceInputs;
}

interface APIState {
  loading: boolean;
  progress: number;
  total: number;
  results: Map<string, { trials: number; highestPhase: string; hasResults: boolean }>;
  fdaResults: Map<string, { clearance: string; hasDrug: boolean; products: number }>;
}

type APIAction =
  | { type: 'START'; total: number }
  | { type: 'CTG_DONE'; company: string; trials: number; highestPhase: string; hasResults: boolean }
  | { type: 'FDA_DONE'; company: string; clearance: string; hasDrug: boolean; products: number }
  | { type: 'TICK' }
  | { type: 'DONE' };

function apiReducer(state: APIState, action: APIAction): APIState {
  switch (action.type) {
    case 'START':
      return { ...state, loading: true, progress: 0, total: action.total };
    case 'CTG_DONE': {
      const results = new Map(state.results);
      results.set(action.company, { trials: action.trials, highestPhase: action.highestPhase, hasResults: action.hasResults });
      return { ...state, results };
    }
    case 'FDA_DONE': {
      const fdaResults = new Map(state.fdaResults);
      fdaResults.set(action.company, { clearance: action.clearance, hasDrug: action.hasDrug, products: action.products });
      return { ...state, fdaResults };
    }
    case 'TICK':
      return { ...state, progress: state.progress + 1 };
    case 'DONE':
      return { ...state, loading: false };
  }
}

const INITIAL_API: APIState = { loading: false, progress: 0, total: 0, results: new Map(), fdaResults: new Map() };

/* ─── tier badge colors ─── */
const TIER_STYLES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SCORE_BAR_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  slate: 'bg-slate-400',
};

/* ─── component ─── */
export default function EvidenceMaturityDashboard() {
  const { verifiedCompanies, verifiedAcquisitions, verifiedAcquirers } = useVerifiedDataset();
  const [apiState, dispatch] = useReducer(apiReducer, INITIAL_API);
  const [enriched, setEnriched] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'value' | 'date'>('score');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ─── base rows from static dataset ─── */
  const baseRows: CompanyRow[] = useMemo(() => {
    return verifiedAcquisitions.map((deal) => {
      const target = verifiedCompanies.find((c) => c.id === deal.targetId);
      const acquirer = verifiedAcquirers.find((a) => a.id === deal.acquirerId);

      const ctg = apiState.results.get(target?.name || '');
      const fda = apiState.fdaResults.get(target?.name || '');

      const inputs: EvidenceInputs = {
        highestPhase: ctg?.highestPhase || 'None',
        totalTrials: ctg?.trials || 0,
        hasPostedResults: ctg?.hasResults || false,
        highestFDAClearance: fda?.clearance || 'None',
        hasDrugApproval: fda?.hasDrug || false,
        totalFDAProducts: fda?.products || 0,
      };

      return {
        id: deal.id,
        name: target?.name || deal.targetId,
        sector: target?.sector || 'Unknown',
        dealValue: deal.dealValue,
        dealDate: deal.announcedDate,
        acquirerName: acquirer?.name || deal.acquirerId,
        evidence: computeEvidenceMaturity(inputs),
        inputs,
      };
    });
  }, [verifiedAcquisitions, verifiedCompanies, verifiedAcquirers, apiState.results, apiState.fdaResults]);

  /* ─── sorted rows ─── */
  const sortedRows = useMemo(() => {
    const rows = [...baseRows];
    switch (sortBy) {
      case 'score': return rows.sort((a, b) => b.evidence.overall - a.evidence.overall);
      case 'value': return rows.sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0));
      case 'date': return rows.sort((a, b) => b.dealDate.localeCompare(a.dealDate));
    }
  }, [baseRows, sortBy]);

  /* ─── correlation ─── */
  const correlation: CorrelationResult = useMemo(() => {
    const data: CompanyEvidence[] = baseRows.map((r) => ({
      companyId: r.id,
      companyName: r.name,
      sector: r.sector,
      evidenceScore: r.evidence.overall,
      dealValue: r.dealValue,
      dealDate: r.dealDate,
    }));
    return computeValuationCorrelation(data);
  }, [baseRows]);

  /* ─── tier distribution ─── */
  const tierDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const r of baseRows) {
      dist[r.evidence.tier] = (dist[r.evidence.tier] || 0) + 1;
    }
    return dist;
  }, [baseRows]);

  /* ─── live enrichment ─── */
  async function enrichFromAPIs() {
    const MAX_ENRICH_COMPANIES = 20;
    const prioritized = [
      ...verifiedCompanies.filter(isGenomicsRelevantCompany),
      ...verifiedCompanies.filter((c) => !isGenomicsRelevantCompany(c)),
    ];
    const companies = [...new Set(prioritized.map((c) => c.name))].slice(0, MAX_ENRICH_COMPANIES);
    dispatch({ type: 'START', total: companies.length * 2 });

    for (const name of companies) {
      try {
        const ctgRes = await fetch(`/api/evidence/clinical-trials?company=${encodeURIComponent(name)}`);
        if (ctgRes.ok) {
          const ctg = await ctgRes.json();
          dispatch({
            type: 'CTG_DONE',
            company: name,
            trials: ctg.totalTrials || 0,
            highestPhase: ctg.highestPhase || 'None',
            hasResults: ctg.hasPostedResults || false,
          });
        }
      } catch { /* non-critical */ }
      dispatch({ type: 'TICK' });

      try {
        const fdaRes = await fetch(`/api/evidence/fda?company=${encodeURIComponent(name)}`);
        if (fdaRes.ok) {
          const fda = await fdaRes.json();
          dispatch({
            type: 'FDA_DONE',
            company: name,
            clearance: fda.highestDeviceClearance || 'None',
            hasDrug: fda.hasDrugApproval || false,
            products: fda.totalProducts || 0,
          });
        }
      } catch { /* non-critical */ }
      dispatch({ type: 'TICK' });
    }

    dispatch({ type: 'DONE' });
    setEnriched(true);
  }

  const avgScore = baseRows.length > 0
    ? Math.round(baseRows.reduce((s, r) => s + r.evidence.overall, 0) / baseRows.length)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-4 sm:p-6">
      <CuratedDatasetBanner className="mb-4" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Evidence Maturity Scoring
          </h3>
          <p className="text-sm text-lacuna-blue">
            How strong is the clinical and regulatory evidence behind each acquisition?
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiState.loading && (
            <span className="text-xs text-lacuna-blue/60">
              Enriching... {apiState.progress}/{apiState.total}
            </span>
          )}
          {!enriched && !apiState.loading && (
            <button
              onClick={() => enrichFromAPIs()}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-lacuna-plum text-white hover:bg-lacuna-plum/90 transition-colors"
            >
              Enrich with Live Data
            </button>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${enriched ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {enriched ? 'Live Data' : apiState.loading ? 'Loading...' : 'Static'}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg bg-lacuna-pink/10 p-3 text-center">
          <p className="text-2xl font-bold text-lacuna-plum">{avgScore}</p>
          <p className="text-xs text-lacuna-blue">Avg Score</p>
        </div>
        <div className="rounded-lg bg-lacuna-pink/10 p-3 text-center">
          <p className="text-2xl font-bold text-lacuna-plum">{baseRows.length}</p>
          <p className="text-xs text-lacuna-blue">Deals Scored</p>
        </div>
        <div className="rounded-lg bg-lacuna-pink/10 p-3 text-center">
          <p className="text-2xl font-bold text-lacuna-plum">{correlation.n}</p>
          <p className="text-xs text-lacuna-blue">With Values</p>
        </div>
        <div className="rounded-lg bg-lacuna-pink/10 p-3 text-center">
          <p className="text-2xl font-bold text-lacuna-plum">{correlation.pearsonR}</p>
          <p className="text-xs text-lacuna-blue">Correlation (r)</p>
        </div>
      </div>

      {/* Tier distribution */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-lacuna-plum uppercase tracking-wide mb-2">
          Evidence Tier Distribution
        </h4>
        <div className="flex gap-2 flex-wrap">
          {(['Regulatory Validated', 'Strong Evidence', 'Growing Evidence', 'Early Evidence', 'Pre-clinical'] as const).map((t) => {
            const count = tierDist[t] || 0;
            if (count === 0) return null;
            const colors: Record<string, string> = {
              'Regulatory Validated': 'bg-emerald-100 text-emerald-800',
              'Strong Evidence': 'bg-sky-100 text-sky-800',
              'Growing Evidence': 'bg-amber-100 text-amber-800',
              'Early Evidence': 'bg-orange-100 text-orange-800',
              'Pre-clinical': 'bg-slate-100 text-slate-700',
            };
            return (
              <span key={t} className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[t]}`}>
                {t}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Valuation correlation insight */}
      <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 mb-6">
        <h4 className="text-xs font-semibold text-lacuna-plum uppercase tracking-wide mb-1">
          Valuation &times; Evidence Correlation
        </h4>
        <p className="text-sm text-lacuna-blue leading-relaxed">
          {correlation.insight}
        </p>
        {correlation.n >= 5 && (
          <div className="flex gap-6 mt-2 text-xs text-lacuna-blue/70">
            <span>High evidence avg: ${(correlation.avgHighEvidence / 1000).toFixed(1)}B</span>
            <span>Low evidence avg: ${(correlation.avgLowEvidence / 1000).toFixed(1)}B</span>
            <span>Premium: {correlation.premiumMultiple}x</span>
          </div>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-lacuna-blue/60">Sort by:</span>
        {(['score', 'value', 'date'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${sortBy === s ? 'bg-lacuna-plum text-white' : 'bg-lacuna-lavender/20 text-lacuna-blue hover:bg-lacuna-lavender/40'}`}
          >
            {s === 'score' ? 'Evidence Score' : s === 'value' ? 'Deal Value' : 'Date'}
          </button>
        ))}
      </div>

      {/* Company evidence cards */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {sortedRows.map((row) => {
          const isExpanded = expandedId === row.id;
          return (
            <button
              key={row.id}
              onClick={() => setExpandedId(isExpanded ? null : row.id)}
              className="w-full text-left rounded-lg border border-lacuna-lavender/30 hover:border-lacuna-lavender/60 transition-colors"
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Score pill */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${SCORE_BAR_COLORS[row.evidence.tierColor] || 'bg-slate-400'} text-white`}>
                  {row.evidence.overall}
                </div>

                {/* Company info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-lacuna-plum truncate">{row.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIER_STYLES[row.evidence.tierColor] || TIER_STYLES.slate}`}>
                      {row.evidence.tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-lacuna-blue/60 mt-0.5">
                    <span>{row.sector}</span>
                    <span>&middot;</span>
                    <span>Acquired by {row.acquirerName}</span>
                    <span>&middot;</span>
                    <span>{row.dealDate.slice(0, 4)}</span>
                  </div>
                </div>

                {/* Deal value */}
                <div className="text-right shrink-0">
                  {row.dealValue ? (
                    <span className="text-sm font-semibold text-lacuna-plum">
                      ${row.dealValue >= 1000 ? `${(row.dealValue / 1000).toFixed(1)}B` : `${row.dealValue}M`}
                    </span>
                  ) : (
                    <span className="text-xs text-lacuna-blue/40">N/D</span>
                  )}
                </div>

                {/* Chevron */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-lacuna-blue/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-lacuna-lavender/20 pt-2">
                  {/* Sub-scores */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {([
                      ['Phase', row.evidence.phaseScore],
                      ['FDA Status', row.evidence.fdaStatusScore],
                      ['Results', row.evidence.clinicalResultsScore],
                      ['Publications', row.evidence.publicationScore],
                    ] as const).map(([label, score]) => (
                      <div key={label} className="text-center">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full ${SCORE_BAR_COLORS[row.evidence.tierColor] || 'bg-slate-400'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-lacuna-blue/60">{label}: {score}/100</span>
                      </div>
                    ))}
                  </div>
                  {/* Narrative */}
                  <p className="text-xs text-lacuna-blue leading-relaxed">
                    {row.evidence.narrative}
                  </p>
                  {/* Evidence inputs */}
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-lacuna-blue/50">
                    <span>Trials: {row.inputs.totalTrials}</span>
                    <span>Phase: {row.inputs.highestPhase.replace('PHASE', 'P')}</span>
                    <span>FDA: {row.inputs.highestFDAClearance}</span>
                    <span>Products: {row.inputs.totalFDAProducts}</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Methodology note */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-[11px] text-lacuna-blue/50 leading-relaxed">
          Evidence Maturity Score (0&ndash;100) = Phase (30%) + FDA Status (30%) + Clinical Results (20%) + Publication Proxy (20%).
          Scores enriched live from ClinicalTrials.gov and openFDA APIs.
          Publication score is estimated from trial maturity since PubMed integration is not yet available.
          Not investment advice — evidence maturity is one signal among many.
        </p>
      </div>
    </div>
  );
}
