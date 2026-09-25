"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import ResearchIntegrityNote from "@/components/research/ResearchIntegrityNote";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { isGenomicsRelevantCompany } from "@/lib/data/genomicsFilters";
import { reportWarning } from "@/lib/observability/reportError";

interface RegistryRecord {
  trials: number | null;
  phase: string | null;
  hasResults: boolean;
  clearance: string | null;
  hasDrug: boolean;
  products: number | null;
}

interface CompanyRow {
  id: string;
  name: string;
  sector: string;
  dealValue: number | undefined;
  dealDate: string;
  acquirerName: string;
  registry: RegistryRecord | null;
}

interface LookupState {
  loading: boolean;
  progress: number;
  total: number;
  trials: Map<
    string,
    { trials: number; highestPhase: string; hasResults: boolean }
  >;
  fda: Map<
    string,
    { clearance: string; hasDrug: boolean; products: number }
  >;
  failures: number;
}

type LookupAction =
  | { type: "START"; total: number }
  | {
    type: "CTG_DONE";
    company: string;
    trials: number;
    highestPhase: string;
    hasResults: boolean;
  }
  | {
    type: "FDA_DONE";
    company: string;
    clearance: string;
    hasDrug: boolean;
    products: number;
  }
  | { type: "TICK" }
  | { type: "FAILED" }
  | { type: "DONE" };

function lookupReducer(state: LookupState, action: LookupAction): LookupState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        loading: true,
        progress: 0,
        total: action.total,
        failures: 0,
      };
    case "CTG_DONE": {
      const trials = new Map(state.trials);
      trials.set(action.company, {
        trials: action.trials,
        highestPhase: action.highestPhase,
        hasResults: action.hasResults,
      });
      return { ...state, trials };
    }
    case "FDA_DONE": {
      const fda = new Map(state.fda);
      fda.set(action.company, {
        clearance: action.clearance,
        hasDrug: action.hasDrug,
        products: action.products,
      });
      return { ...state, fda };
    }
    case "TICK":
      return { ...state, progress: state.progress + 1 };
    case "FAILED":
      return { ...state, failures: state.failures + 1 };
    case "DONE":
      return { ...state, loading: false };
  }
}

const INITIAL_LOOKUP: LookupState = {
  loading: false,
  progress: 0,
  total: 0,
  trials: new Map(),
  fda: new Map(),
  failures: 0,
};

function recordedPhase(phase: string | undefined): string | null {
  if (
    !phase || phase === "None" || phase === "NA" || phase === "Not Applicable"
  ) {
    return null;
  }
  return phase.replaceAll("PHASE", "Phase ").replaceAll("_", " ");
}

function registryFromLookups(
  ctg:
    | { trials: number; highestPhase: string; hasResults: boolean }
    | undefined,
  fda: { clearance: string; hasDrug: boolean; products: number } | undefined,
): RegistryRecord | null {
  if (!ctg && !fda) return null;
  const record: RegistryRecord = {
    trials: ctg && ctg.trials > 0 ? ctg.trials : null,
    phase: recordedPhase(ctg?.highestPhase),
    hasResults: Boolean(ctg?.hasResults),
    clearance: fda && fda.clearance && fda.clearance !== "None"
      ? fda.clearance
      : null,
    hasDrug: Boolean(fda?.hasDrug),
    products: fda && fda.products > 0 ? fda.products : null,
  };
  const hasField = record.trials != null || record.phase != null ||
    record.hasResults || record.clearance != null || record.hasDrug ||
    record.products != null;
  return hasField ? record : null;
}

function formatDisclosedValue(value: number): string {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}B` : `$${value}M`;
}

export default function EvidenceMaturityDashboard() {
  const { verifiedCompanies, verifiedAcquisitions, verifiedAcquirers } =
    useVerifiedDataset();
  const [lookups, dispatch] = useReducer(lookupReducer, INITIAL_LOOKUP);
  const [enriched, setEnriched] = useState(false);
  const [sortBy, setSortBy] = useState<"value" | "date">("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows: CompanyRow[] = useMemo(() => {
    return verifiedAcquisitions.map((deal) => {
      const target = verifiedCompanies.find((c) => c.id === deal.targetId);
      const acquirer = verifiedAcquirers.find((a) => a.id === deal.acquirerId);
      const name = target?.name || deal.targetId;
      return {
        id: deal.id,
        name,
        sector: target?.sector || "Sector not recorded",
        dealValue: deal.dealValue,
        dealDate: deal.announcedDate,
        acquirerName: acquirer?.name || deal.acquirerId,
        registry: registryFromLookups(
          lookups.trials.get(name),
          lookups.fda.get(name),
        ),
      };
    });
  }, [
    verifiedAcquisitions,
    verifiedCompanies,
    verifiedAcquirers,
    lookups.trials,
    lookups.fda,
  ]);

  const sortedRows = useMemo(() => {
    const next = [...rows];
    if (sortBy === "value") {
      next.sort((a, b) => {
        if (a.dealValue == null && b.dealValue == null) return 0;
        if (a.dealValue == null) return 1;
        if (b.dealValue == null) return -1;
        return b.dealValue - a.dealValue;
      });
      return next;
    }
    next.sort((a, b) => b.dealDate.localeCompare(a.dealDate));
    return next;
  }, [rows, sortBy]);

  const recordedCount = rows.filter((row) => row.registry != null).length;

  const enrichFromAPIs = useCallback(async () => {
    const MAX_ENRICH_COMPANIES = 60;
    const prioritized = [
      ...verifiedCompanies.filter(isGenomicsRelevantCompany),
      ...verifiedCompanies.filter((c) => !isGenomicsRelevantCompany(c)),
    ];
    const companies = [...new Set(prioritized.map((c) => c.name))].slice(
      0,
      MAX_ENRICH_COMPANIES,
    );
    dispatch({ type: "START", total: companies.length * 2 });

    for (const name of companies) {
      try {
        const ctgRes = await fetch(
          `/api/evidence/clinical-trials?company=${encodeURIComponent(name)}`,
        );
        if (!ctgRes.ok) {
          throw new Error(`clinical-trials lookup failed: ${ctgRes.status}`);
        }
        const ctg = await ctgRes.json();
        dispatch({
          type: "CTG_DONE",
          company: name,
          trials: typeof ctg.totalTrials === "number" ? ctg.totalTrials : 0,
          highestPhase: typeof ctg.highestPhase === "string"
            ? ctg.highestPhase
            : "None",
          hasResults: Boolean(ctg.hasPostedResults),
        });
      } catch (error) {
        reportWarning("evidence.enrich.clinicalTrials", error, {
          company: name,
        });
        dispatch({ type: "FAILED" });
      }
      dispatch({ type: "TICK" });

      try {
        const fdaRes = await fetch(
          `/api/evidence/fda?company=${encodeURIComponent(name)}`,
        );
        if (!fdaRes.ok) {
          throw new Error(`FDA lookup failed: ${fdaRes.status}`);
        }
        const fda = await fdaRes.json();
        dispatch({
          type: "FDA_DONE",
          company: name,
          clearance: typeof fda.highestDeviceClearance === "string"
            ? fda.highestDeviceClearance
            : "None",
          hasDrug: Boolean(fda.hasDrugApproval),
          products: typeof fda.totalProducts === "number"
            ? fda.totalProducts
            : 0,
        });
      } catch (error) {
        reportWarning("evidence.enrich.fda", error, { company: name });
        dispatch({ type: "FAILED" });
      }
      dispatch({ type: "TICK" });
    }

    dispatch({ type: "DONE" });
    setEnriched(true);
  }, [verifiedCompanies]);

  useEffect(() => {
    if (!enriched && !lookups.loading && verifiedCompanies.length > 0) {
      const timer = window.setTimeout(() => {
        void enrichFromAPIs();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [verifiedCompanies.length, enriched, lookups.loading, enrichFromAPIs]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-4 sm:p-6">
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Registry fields on verified targets
          </h3>
          <p className="text-sm text-lacuna-blue mt-1">
            ClinicalTrials.gov and openFDA fields are shown when a lookup
            returns them. A missing lookup is omitted. It is not a score, a
            GRADE rating, or a clinical-validation claim.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lookups.loading && (
            <span className="text-xs text-lacuna-blue/60">
              Looking up records... {lookups.progress}/{lookups.total}
            </span>
          )}
          {!enriched && !lookups.loading && (
            <button
              onClick={() => void enrichFromAPIs()}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-lacuna-plum text-white hover:bg-lacuna-plum/90 transition-colors"
            >
              Look up registry records
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <ResearchIntegrityNote />
      </div>

      {!lookups.loading && lookups.failures > 0 && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-6"
        >
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-medium">Partial lookup.</span>{" "}
            {lookups.failures} of {lookups.total}{" "}
            ClinicalTrials.gov / openFDA lookups failed. Those targets stay
            blank. A failed lookup is not recorded as zero and is not a negative
            finding.
          </p>
        </div>
      )}

      {recordedCount === 0 && (
        <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/15 px-4 py-3 mb-6">
          <p className="text-sm text-lacuna-blue leading-relaxed">
            {lookups.loading
              ? "Fetching trial and FDA records. Nothing is scored while the lookup runs."
              : "No trial or FDA record is attached to these targets in the current lookup."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-lacuna-blue/60">Sort by:</span>
        {(["date", "value"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              sortBy === key
                ? "bg-lacuna-plum text-white"
                : "bg-lacuna-lavender/20 text-lacuna-blue hover:bg-lacuna-lavender/40"
            }`}
          >
            {key === "value" ? "Disclosed value" : "Announcement date"}
          </button>
        ))}
      </div>

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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-lacuna-plum truncate">
                      {row.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-lacuna-border text-lacuna-text-secondary">
                      {row.registry
                        ? "Registry fields recorded"
                        : "No registry record"}
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
                <div className="text-right shrink-0">
                  {row.dealValue != null
                    ? (
                      <span className="text-sm font-semibold text-lacuna-plum">
                        {formatDisclosedValue(row.dealValue)}
                      </span>
                    )
                    : (
                      <span className="text-xs text-lacuna-blue/40">
                        Not disclosed
                      </span>
                    )}
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-lacuna-lavender/20 pt-2 text-xs text-lacuna-blue">
                  {row.registry
                    ? (
                      <div className="flex flex-wrap gap-2">
                        {row.registry.trials != null && (
                          <span>Trials recorded: {row.registry.trials}</span>
                        )}
                        {row.registry.phase && (
                          <span>
                            Highest phase recorded: {row.registry.phase}
                          </span>
                        )}
                        {row.registry.hasResults && (
                          <span>Posted results recorded</span>
                        )}
                        {row.registry.clearance && (
                          <span>
                            FDA clearance recorded: {row.registry.clearance}
                          </span>
                        )}
                        {row.registry.hasDrug && (
                          <span>Drug approval recorded</span>
                        )}
                        {row.registry.products != null && (
                          <span>
                            FDA products recorded: {row.registry.products}
                          </span>
                        )}
                      </div>
                    )
                    : (
                      <p>
                        No trial or FDA field is recorded for this target. The
                        blank is not a pre-clinical grade and not a zero.
                      </p>
                    )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
