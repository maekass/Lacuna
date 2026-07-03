"use client";

import { useEffect, useReducer } from "react";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import { DOMESTIC_TRIAL_PRESETS } from "@/lib/research/institutionPresets";
import {
  CLINICAL_TRIALS_ML_MODEL,
  getClinicalTrialsTrainingSource,
  isCompletionProxyAvailable,
  scoreClinicalTrial,
} from "@/lib/ml/clinicalTrials/scoreClinicalTrial";
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
  interventions?: string[];
}

interface FetchState {
  trials: Trial[];
  total: number;
  loading: boolean;
  error: string | null;
}

type FetchAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; trials: Trial[]; total: number }
  | { type: "FETCH_ERR"; error: string };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_OK":
      return {
        trials: action.trials,
        total: action.total,
        loading: false,
        error: null,
      };
    case "FETCH_ERR":
      return { trials: [], total: 0, loading: false, error: action.error };
  }
}

const INITIAL_STATE: FetchState = {
  trials: [],
  total: 0,
  loading: false,
  error: null,
};

const STATUS_COLORS: Record<string, string> = {
  RECRUITING: "bg-emerald-100 text-emerald-800",
  "ACTIVE_NOT_RECRUITING": "bg-sky-100 text-sky-800",
  COMPLETED: "bg-lacuna-surface-subtle text-lacuna-text-primary",
  "NOT_YET_RECRUITING": "bg-amber-100 text-amber-800",
  TERMINATED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-red-50 text-red-600",
  SUSPENDED: "bg-orange-100 text-orange-700",
  UNKNOWN: "bg-lacuna-surface-subtle text-lacuna-text-secondary",
};

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── component ─── */
export default function ClinicalTrialTracker() {
  const [activeCategory, setActiveCategory] = useReducer(
    (_prev: number, next: number) => next,
    0,
  );
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);
  const { trials, total, loading, error } = state;
  const activePreset = DOMESTIC_TRIAL_PRESETS[activeCategory];

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10_000);

    dispatch({ type: "FETCH_START" });

    const params = new URLSearchParams({
      condition: activePreset.condition,
      limit: "40",
    });
    if (activePreset.sponsor) params.set("sponsor", activePreset.sponsor);

    fetch(`/api/clinical-trials?${params}`, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        dispatch({
          type: "FETCH_OK",
          trials: data.trials ?? [],
          total: data.total ?? 0,
        });
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err instanceof DOMException && err.name === "AbortError") {
          if (timedOut) {
            dispatch({
              type: "FETCH_ERR",
              error:
                "ClinicalTrials.gov data source is taking too long. Try again later.",
            });
          }
          return;
        }
        dispatch({
          type: "FETCH_ERR",
          error:
            "ClinicalTrials.gov is currently unavailable. Try again later.",
        });
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activePreset]);

  /* ─── derived stats ─── */
  const phaseDistribution = trials.reduce<Record<string, number>>((acc, t) => {
    const p = t.phase || "Not Applicable";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = trials.reduce<Record<string, number>>((acc, t) => {
    const s = t.status || "Unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const totalEnrollment = trials.reduce((s, t) => s + (t.enrollment || 0), 0);

  const topSponsors = Object.entries(
    trials.reduce<Record<string, number>>((acc, t) => {
      const sp = t.sponsor || "Unknown";
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
          <ModelProvenanceHint model={CLINICAL_TRIALS_ML_MODEL}>
            <p className="text-sm text-lacuna-blue cursor-help">
              Live data from ClinicalTrials.gov · WH relevance
            {isCompletionProxyAvailable() ? " + completion proxy" : ""} (
            {getClinicalTrialsTrainingSource()})
            </p>
          </ModelProvenanceHint>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 self-start">
          Live API
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mb-2">
        {DOMESTIC_TRIAL_PRESETS.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i === activeCategory
                ? "bg-lacuna-plum text-white"
                : "bg-lacuna-lavender/20 text-lacuna-blue hover:bg-lacuna-lavender/40"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-lacuna-blue/70 mt-3 mb-4">
        {activePreset.description}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Phase distribution */}
            <div className="rounded-lg border border-lacuna-border p-3">
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
                      <div className="w-16 h-1.5 bg-lacuna-surface-subtle rounded-full overflow-hidden">
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
            <div className="rounded-lg border border-lacuna-border p-3">
              <p className="text-xs font-semibold text-lacuna-plum mb-2">
                Status breakdown
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(statusDistribution)
                  .sort((a, b) =>
                    b[1] - a[1]
                  )
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
            <div className="rounded-lg border border-lacuna-border p-3">
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
            {trials.slice(0, 8).map((trial) => {
              const scores = scoreClinicalTrial({
                title: trial.title,
                condition: trial.condition,
                sponsor: trial.sponsor,
                interventions: trial.interventions,
                phase: trial.phase,
                status: trial.status,
                enrollment: trial.enrollment,
              });
              const whScore = scores.whRelevance;
              const completion = scores.completionProxy;
              return (
              <div
                key={trial.nctId}
                className="rounded-lg border border-lacuna-border p-3 hover:border-lacuna-lavender/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-lacuna-plum leading-snug line-clamp-2">
                      {trial.title}
                    </p>
                    <p className="text-xs text-lacuna-blue mt-1 truncate">
                      {trial.sponsor} ·{" "}
                      {trial.condition || "Multiple conditions"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0 flex-wrap justify-end">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        whScore.label
                          ? "bg-lacuna-pink/20 text-lacuna-plum border border-lacuna-pink/40"
                          : "bg-lacuna-surface-subtle text-lacuna-text-secondary"
                      }`}
                      title={`WH relevance ${Math.round(whScore.probability * 100)}%`}
                    >
                      WH {Math.round(whScore.probability * 100)}%
                    </span>
                    {completion != null && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200"
                        title={`Completion proxy ${Math.round(completion.probability * 100)}% (COMPLETED vs stopped — not efficacy)`}
                      >
                        Complete {Math.round(completion.probability * 100)}%
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        STATUS_COLORS[trial.status] || STATUS_COLORS.UNKNOWN
                      }`}
                    >
                      {statusLabel(trial.status)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-lacuna-surface-subtle text-lacuna-text-primary">
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
            );
            })}
          </div>

          {trials.length === 0 && !loading && (
            <p className="text-sm text-lacuna-blue/60 text-center py-6">
              No ClinicalTrials.gov matches were found for this current query.
            </p>
          )}

          {/* Disclaimer */}
          <div className="mt-4 pt-3 border-t border-lacuna-border-subtle">
            <p className="text-[11px] text-lacuna-blue/50">
              Data sourced from{" "}
              <a
                href="https://clinicaltrials.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                ClinicalTrials.gov
              </a>{" "}
              API v2. Results reflect the most recent data available. This is
              not a substitute for IQVIA i3 or other institutional trial
              intelligence platforms — trial counts may differ due to sponsor
              matching, condition indexing, and query scope. A zero result means
              no matches for the current live filter, not proof that no trials
              exist in the broader market.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
