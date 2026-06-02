'use client';

import { useReducer, useEffect } from 'react';

/* ─── types ─── */
interface Trial {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  condition: string;
  sponsor: string;
  enrollment: number;
  startDate: string;
  completionDate?: string;
}

interface FetchState {
  trials: Trial[];
  total: number;
  loading: boolean;
  error: string | null;
}

type FetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_OK'; trials: Trial[]; total: number }
  | { type: 'FETCH_ERR'; error: string };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_OK':
      return { trials: action.trials, total: action.total, loading: false, error: null };
    case 'FETCH_ERR':
      return { trials: [], total: 0, loading: false, error: action.error };
  }
}

const INITIAL_STATE: FetchState = { trials: [], total: 0, loading: false, error: null };

interface CategoryConfig {
  label: string;
  query: string;
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    label: "Women's Health",
    query: 'women health female reproductive',
    description: 'Fertility, maternal care, menopause, contraception, pelvic health',
  },
  {
    label: 'Oncology',
    query: 'breast cancer ovarian cervical',
    description: 'Breast, ovarian, cervical, and endometrial cancers',
  },
  {
    label: 'Genetic Markers',
    query: 'BRCA genetic biomarker hereditary cancer screening',
    description: 'BRCA1/2, HER2, genomic profiling, carrier screening',
  },
  {
    label: 'Precision Medicine',
    query: 'precision medicine targeted therapy immunotherapy women',
    description: 'Targeted therapies, ADCs, immunotherapy, companion diagnostics',
  },
];

const STATUS_COLORS: Record<string, string> = {
  RECRUITING: 'bg-emerald-100 text-emerald-800',
  'ACTIVE_NOT_RECRUITING': 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-slate-100 text-slate-700',
  'NOT_YET_RECRUITING': 'bg-amber-100 text-amber-800',
  TERMINATED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-red-50 text-red-600',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  UNKNOWN: 'bg-gray-100 text-gray-600',
};

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── component ─── */
export default function ClinicalTrialTracker() {
  const [activeCategory, setActiveCategory] = useReducer(
    (_prev: number, next: number) => next,
    0,
  );
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);
  const { trials, total, loading, error } = state;

  useEffect(() => {
    const controller = new AbortController();

    dispatch({ type: 'FETCH_START' });

    const cat = CATEGORIES[activeCategory];
    const params = new URLSearchParams({
      condition: cat.query,
      limit: '20',
    });

    fetch(`/api/clinical-trials?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        dispatch({ type: 'FETCH_OK', trials: data.trials ?? [], total: data.total ?? 0 });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        dispatch({ type: 'FETCH_ERR', error: 'ClinicalTrials.gov is currently unavailable. Try again later.' });
      });

    return () => controller.abort();
  }, [activeCategory]);

  /* ─── derived stats ─── */
  const phaseDistribution = trials.reduce<Record<string, number>>((acc, t) => {
    const p = t.phase || 'Not Applicable';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = trials.reduce<Record<string, number>>((acc, t) => {
    const s = t.status || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const totalEnrollment = trials.reduce((s, t) => s + (t.enrollment || 0), 0);

  const topSponsors = Object.entries(
    trials.reduce<Record<string, number>>((acc, t) => {
      const sp = t.sponsor || 'Unknown';
      acc[sp] = (acc[sp] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Clinical Trial Tracker
          </h3>
          <p className="text-sm text-lacuna-blue">
            Live data from ClinicalTrials.gov · i3-style pipeline intelligence
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 self-start">
          Live API
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mb-2">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i === activeCategory
                ? 'bg-lacuna-plum text-white'
                : 'bg-lacuna-lavender/20 text-lacuna-blue hover:bg-lacuna-lavender/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-lacuna-blue/70 mt-3 mb-4">
        {CATEGORIES[activeCategory].description}
      </p>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-lacuna-plum/30 border-t-lacuna-plum rounded-full animate-spin" />
          <span className="ml-3 text-sm text-lacuna-blue">
            Querying ClinicalTrials.gov…
          </span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
              <p className="text-2xl font-bold text-lacuna-plum">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-lacuna-blue mt-1">Total trials</p>
            </div>
            <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
              <p className="text-2xl font-bold text-lacuna-plum">
                {trials.length}
              </p>
              <p className="text-xs text-lacuna-blue mt-1">Shown</p>
            </div>
            <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
              <p className="text-2xl font-bold text-lacuna-plum">
                {totalEnrollment.toLocaleString()}
              </p>
              <p className="text-xs text-lacuna-blue mt-1">
                Enrollment (shown)
              </p>
            </div>
            <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
              <p className="text-2xl font-bold text-lacuna-plum">
                {Object.keys(phaseDistribution).length}
              </p>
              <p className="text-xs text-lacuna-blue mt-1">
                Phases represented
              </p>
            </div>
          </div>

          {/* Phase + Status + Sponsors row */}
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            {/* Phase distribution */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-lacuna-plum mb-2">
                Phase distribution
              </p>
              {Object.entries(phaseDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([phase, count]) => (
                  <div
                    key={phase}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-lacuna-blue truncate mr-2">
                      {phase}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lacuna-plum rounded-full"
                          style={{
                            width: `${(count / trials.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-medium text-lacuna-plum w-4 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Status breakdown */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-lacuna-plum mb-2">
                Status breakdown
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(statusDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <span
                      key={status}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN
                      }`}
                    >
                      {statusLabel(status)} ({count})
                    </span>
                  ))}
              </div>
            </div>

            {/* Top sponsors */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-lacuna-plum mb-2">
                Top sponsors
              </p>
              {topSponsors.map(([sponsor, count]) => (
                <div
                  key={sponsor}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span className="text-lacuna-blue truncate mr-2">
                    {sponsor}
                  </span>
                  <span className="font-medium text-lacuna-plum shrink-0">
                    {count}
                  </span>
                </div>
              ))}
              {topSponsors.length === 0 && (
                <p className="text-xs text-lacuna-blue/60">No data</p>
              )}
            </div>
          </div>

          {/* Trial cards */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-lacuna-plum">
              Recent trials
            </p>
            {trials.slice(0, 8).map((trial) => (
              <div
                key={trial.nctId}
                className="rounded-lg border border-slate-200 p-3 hover:border-lacuna-lavender/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-lacuna-plum leading-snug line-clamp-2">
                      {trial.title}
                    </p>
                    <p className="text-xs text-lacuna-blue mt-1 truncate">
                      {trial.sponsor} · {trial.condition || 'Multiple conditions'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        STATUS_COLORS[trial.status] || STATUS_COLORS.UNKNOWN
                      }`}
                    >
                      {statusLabel(trial.status)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                      {trial.phase}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-lacuna-blue/70">
                  <span>
                    <a
                      href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lacuna-blue hover:text-lacuna-plum underline underline-offset-2"
                    >
                      {trial.nctId}
                    </a>
                  </span>
                  {trial.enrollment > 0 && (
                    <span>Enrollment: {trial.enrollment.toLocaleString()}</span>
                  )}
                  {trial.startDate && <span>Start: {trial.startDate}</span>}
                  {trial.completionDate && (
                    <span>Est. completion: {trial.completionDate}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {trials.length === 0 && !loading && (
            <p className="text-sm text-lacuna-blue/60 text-center py-6">
              No trials found for this category.
            </p>
          )}

          {/* Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-lacuna-blue/50">
              Data sourced from{' '}
              <a
                href="https://clinicaltrials.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                ClinicalTrials.gov
              </a>{' '}
              API v2. Results reflect the most recent data available. This is not
              a substitute for IQVIA i3 or other institutional trial intelligence
              platforms — trial counts may differ due to query scope and
              classification methodology.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
