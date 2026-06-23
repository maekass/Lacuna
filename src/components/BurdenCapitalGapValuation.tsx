"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { deriveStageMedians } from "@/lib/quant/empiricalPriors";
import {
  BURDEN_AREAS,
  CITATIONS,
  CITATION_LIST,
  computeGapMetrics,
  valuateInvestment,
  formatValuation,
  type FundingStage,
  type ClinicalEvidence,
  type ValuationInputs,
  type GapMetrics,
} from "@/lib/valuation/burdenCapitalGap";

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES: FundingStage[] = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
];

const EVIDENCE_OPTIONS: { value: ClinicalEvidence; label: string }[] = [
  { value: "none", label: "No clinical data" },
  { value: "pilot", label: "Pilot / feasibility" },
  { value: "retrospective", label: "Retrospective study" },
  { value: "rct_phase2", label: "RCT / Phase 2" },
  { value: "pivotal_phase3", label: "Pivotal / Phase 3" },
  { value: "fda_cleared", label: "FDA cleared / approved" },
];

const GAP_SIGNAL_STYLES = {
  Significant: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-400",
  },
  Moderate: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-400",
  },
  Limited: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    bar: "bg-slate-400",
  },
};

// ─── Citation helpers ─────────────────────────────────────────────────────────

function CitationMarkers({ ids }: { ids: string[] }) {
  const labels = ids
    .map((id) => CITATIONS[id]?.label)
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b));
  if (!labels.length) return null;
  return (
    <span className="ml-0.5 align-super text-[9px] text-lacuna-blue/60 font-medium">
      [{labels.join(",")}]
    </span>
  );
}

function CitationFootnotes({ ids }: { ids: string[] }) {
  const cites = CITATION_LIST.filter((c) => ids.includes(c.id));
  if (!cites.length) return null;
  return (
    <div className="mt-4 border-t border-lacuna-pink/20 pt-3 space-y-1.5">
      <p className="text-xs font-semibold text-lacuna-plum mb-1">Sources</p>
      {cites.map((c) => (
        <p key={c.id} className="text-xs text-lacuna-blue/60 leading-relaxed">
          <span className="font-medium text-lacuna-blue/80">[{c.label}]</span>{" "}
          {c.reference}
        </p>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FactorBar({ score }: { score: number }) {
  // score is -2 to +2, map to 0-100%
  const pct = ((score + 2) / 4) * 100;
  const color =
    score >= 1
      ? "bg-emerald-400"
      : score >= 0
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <div className="relative h-1.5 w-full rounded-full bg-lacuna-pink/20">
      <div
        className={`absolute left-1/2 h-1.5 rounded-full ${color} transition-all duration-500`}
        style={{
          left: score >= 0 ? "50%" : `${pct}%`,
          width: `${Math.abs(pct - 50)}%`,
        }}
      />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-lacuna-plum/30" />
    </div>
  );
}

function GapLandscape({ metrics }: { metrics: GapMetrics[] }) {
  const sorted = [...metrics].sort((a, b) => b.gapScore - a.gapScore);
  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const signal =
          m.gapScore >= 65
            ? "Significant"
            : m.gapScore >= 35
              ? "Moderate"
              : "Limited";
        const styles = GAP_SIGNAL_STYLES[signal];
        return (
          <div key={m.areaKey} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-right text-xs text-lacuna-blue">
              {m.area.name}
            </span>
            <div className="relative flex-1 rounded-full bg-lacuna-pink/15">
              <motion.div
                className={`h-3 rounded-full ${styles.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${m.gapScore}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-lacuna-plum">
              {m.gapScore.toFixed(0)}
            </span>
          </div>
        );
      })}
      <p className="pt-1 text-right text-xs text-lacuna-blue/60">
        Gap score 1–100 (higher = more underfunded relative to burden)
        <CitationMarkers ids={["gbd2021", "rock_health_2024", "pitchbook_2024"]} />
        . Minimum score is 1 (lowest in dataset), not zero.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BurdenCapitalGapValuation() {
  const { verifiedCompanies } = useVerifiedDataset();
  const allMetrics = useMemo(() => computeGapMetrics(), []);
  const stageMedians = useMemo(
    () => deriveStageMedians(verifiedCompanies),
    [verifiedCompanies],
  );

  const [areaKey, setAreaKey] = useState<string>("endometriosis");
  const [stage, setStage] = useState<FundingStage>("Series A");
  const [fundingM, setFundingM] = useState<number>(15);
  const [evidence, setEvidence] = useState<ClinicalEvidence>("pilot");
  const [hasReimbursement, setHasReimbursement] = useState(false);
  const [hasEquityAngle, setHasEquityAngle] = useState(false);
  const [isPlatform, setIsPlatform] = useState(false);

  const result = useMemo(() => {
    const inputs: ValuationInputs = {
      areaKey,
      stage,
      totalFundingRaisedM: fundingM,
      clinicalEvidence: evidence,
      hasReimbursement,
      hasEquityAngle,
      isPlatform,
    };
    try {
      return valuateInvestment(inputs, allMetrics, stageMedians.medians);
    } catch {
      return null;
    }
  }, [areaKey, stage, fundingM, evidence, hasReimbursement, hasEquityAngle, isPlatform, allMetrics, stageMedians]);

  const selectedMetrics = allMetrics.find((m) => m.areaKey === areaKey);
  const selectedArea = BURDEN_AREAS[areaKey];

  const signalStyles = result
    ? GAP_SIGNAL_STYLES[result.gapSignal]
    : GAP_SIGNAL_STYLES.Moderate;

  return (
    <div className="space-y-6">
      <CuratedDatasetBanner />

      {/* Gap landscape overview */}
      <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-lacuna-plum">
          Burden-Capital Gap Landscape
        </h3>
        <p className="mb-4 text-xs text-lacuna-blue/80">
          Each bar shows how underfunded a disease area is relative to its
          societal burden (DALYs<CitationMarkers ids={["gbd2021"]} />,
          prevalence<CitationMarkers ids={["acog_2023"]} />, mortality
          <CitationMarkers ids={["cdc_wonder_2022"]} />). VC deployment from
          Rock Health<CitationMarkers ids={["rock_health_2024"]} /> &amp;
          PitchBook<CitationMarkers ids={["pitchbook_2024"]} /> 2019-2024.
        </p>
        <GapLandscape metrics={allMetrics} />
      </div>

      {/* Two-column: inputs + output */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Inputs ── */}
        <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-lacuna-plum">
            Investment parameters
          </h3>

          {/* Therapeutic area */}
          <label className="mb-1 block text-xs font-medium text-lacuna-blue">
            Therapeutic area
          </label>
          <select
            value={areaKey}
            onChange={(e) => setAreaKey(e.target.value)}
            className="mb-4 w-full rounded-lg border border-lacuna-pink/40 bg-lacuna-pink/5 px-3 py-2 text-sm text-lacuna-plum focus:outline-none focus:ring-2 focus:ring-lacuna-plum/30"
          >
            {Object.entries(BURDEN_AREAS).map(([k, a]) => (
              <option key={k} value={k}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Stage */}
          <label className="mb-1 block text-xs font-medium text-lacuna-blue">
            Funding stage
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  stage === s
                    ? "bg-lacuna-plum text-white"
                    : "bg-lacuna-pink/10 text-lacuna-plum hover:bg-lacuna-pink/25"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Funding raised */}
          <label className="mb-1 block text-xs font-medium text-lacuna-blue">
            Total funding raised: <span className="text-lacuna-plum font-semibold">${fundingM}M</span>
          </label>
          <input
            type="range"
            min={1}
            max={500}
            value={fundingM}
            onChange={(e) => setFundingM(Number(e.target.value))}
            className="mb-4 w-full accent-[#5D4E6D]"
          />

          {/* Clinical evidence */}
          <label className="mb-1 block text-xs font-medium text-lacuna-blue">
            Clinical evidence
          </label>
          <select
            value={evidence}
            onChange={(e) => setEvidence(e.target.value as ClinicalEvidence)}
            className="mb-4 w-full rounded-lg border border-lacuna-pink/40 bg-lacuna-pink/5 px-3 py-2 text-sm text-lacuna-plum focus:outline-none focus:ring-2 focus:ring-lacuna-plum/30"
          >
            {EVIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Toggles */}
          <div className="space-y-2">
            {(
              [
                [hasReimbursement, setHasReimbursement, "Has reimbursement pathway (CPT / payer coverage)"],
                [hasEquityAngle, setHasEquityAngle, "Addresses health disparities / equity angle"],
                [isPlatform, setIsPlatform, "Platform play (multiple indications)"],
              ] as [boolean, (v: boolean) => void, string][]
            ).map(([val, setter, label]) => (
              <button
                key={label}
                onClick={() => setter(!val)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  val
                    ? "border-lacuna-plum/30 bg-lacuna-plum/8 text-lacuna-plum"
                    : "border-lacuna-pink/30 bg-lacuna-pink/5 text-lacuna-blue/70 hover:bg-lacuna-pink/10"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    val
                      ? "border-lacuna-plum bg-lacuna-plum text-white"
                      : "border-lacuna-blue/30 bg-white"
                  }`}
                >
                  {val && (
                    <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Output ── */}
        <div className="space-y-4">
          {/* Area context card */}
          {selectedArea && selectedMetrics && (
            <div
              className={`rounded-xl border p-4 ${signalStyles.bg} ${signalStyles.border}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className={`text-sm font-semibold ${signalStyles.text}`}>
                  {selectedArea.name}
                </h4>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${signalStyles.badge}`}
                >
                  {result?.gapSignal} gap
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <Stat
                  label="US DALYs / yr"
                  value={`${(selectedArea.dalyThousandsPerYear / 1000).toFixed(1)}M`}
                  citationIds={["gbd2021"]}
                />
                <Stat
                  label="US prevalence"
                  value={`${selectedArea.prevalenceMillion}M women`}
                  citationIds={["acog_2023"]}
                />
                <Stat
                  label="NIH funding"
                  value={`$${selectedArea.nihFundingMillionPerYear}M/yr`}
                  citationIds={["nih_reporter_2023"]}
                />
                <Stat
                  label="VC deployed (2019-24)"
                  value={selectedArea.vcDeployedMillion >= 1000
                    ? `$${(selectedArea.vcDeployedMillion / 1000).toFixed(1)}B`
                    : `$${selectedArea.vcDeployedMillion}M`}
                  citationIds={["rock_health_2024", "pitchbook_2024"]}
                />
                <Stat
                  label="VC / 1k DALYs"
                  value={`$${selectedMetrics.capitalPerKDaly.toFixed(2)}M`}
                  citationIds={["gbd2021", "rock_health_2024"]}
                />
                <Stat
                  label="Neglect score"
                  value={`${selectedArea.neglectScore}/5`}
                />
                {selectedArea.economicBurdenBillion !== undefined && (
                  <Stat
                    label="Economic burden"
                    value={`$${selectedArea.economicBurdenBillion}B/yr`}
                    citationIds={["yadav_pcos_2023", "azziz_pcos_2005"]}
                  />
                )}
              </div>
              {selectedArea.regulatoryNote && (
                <p className={`mt-2 text-xs italic ${signalStyles.text}`}>
                  {selectedArea.regulatoryNote}
                </p>
              )}
              <CitationFootnotes ids={selectedArea.citationIds} />
            </div>
          )}

          {/* Valuation output */}
          {result && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${areaKey}-${stage}-${evidence}-${hasReimbursement}-${hasEquityAngle}-${isPlatform}-${fundingM}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm"
              >
                <h3 className="mb-1 text-sm font-semibold text-lacuna-plum">
                  Estimated valuation range
                </h3>
                <p className="mb-4 text-xs text-lacuna-blue/70">
                  Stage comparable × {result.gapMultiplier.toFixed(2)}× gap
                  multiplier × factor adjustments
                </p>

                {/* Range display */}
                <div className="mb-4 flex items-end justify-between gap-2">
                  <div className="text-center">
                    <div className="text-xs text-lacuna-blue/70">Low</div>
                    <div className="text-lg font-bold text-lacuna-plum">
                      {formatValuation(result.lowM)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative h-2 rounded-full bg-lacuna-pink/20">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lacuna-pink/40 via-lacuna-plum/60 to-lacuna-plum" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-lacuna-blue/70">Mid</div>
                    <div className="text-2xl font-bold text-lacuna-plum">
                      {formatValuation(result.midM)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative h-2 rounded-full bg-lacuna-pink/20">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lacuna-plum via-lacuna-plum/60 to-lacuna-pink/40" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-lacuna-blue/70">High</div>
                    <div className="text-lg font-bold text-lacuna-plum">
                      {formatValuation(result.highM)}
                    </div>
                  </div>
                </div>

                {/* Stage anchor */}
                <div className="mb-4 rounded-lg bg-lacuna-pink/8 px-3 py-2 text-xs text-lacuna-blue">
                  Stage comparable (median): {formatValuation(result.stageComparableM)} →{" "}
                  <span className="font-medium text-lacuna-plum">
                    {result.gapMultiplier.toFixed(2)}× gap premium
                  </span>{" "}
                  → {formatValuation(result.midM)} mid-point
                </div>

                {/* Factor breakdown */}
                <h4 className="mb-2 text-xs font-semibold text-lacuna-plum">
                  Value drivers
                </h4>
                <div className="space-y-2">
                  {result.factors.map((f) => (
                    <div key={f.name}>
                      <div className="mb-0.5 flex justify-between text-xs">
                        <span className="text-lacuna-blue">{f.name}</span>
                        <span
                          className={
                            f.score > 0
                              ? "text-emerald-600"
                              : f.score < 0
                                ? "text-red-500"
                                : "text-lacuna-blue/60"
                          }
                        >
                          {f.score > 0 ? "+" : ""}
                          {f.score.toFixed(1)}
                        </span>
                      </div>
                      <FactorBar score={f.score} />
                      <p className="mt-0.5 text-xs text-lacuna-blue/60">
                        {f.note}
                      </p>
                    </div>
                  ))}
                </div>

                {/* WHO Cost-Effectiveness */}
                {result.whocea.category !== "Insufficient data" && (
                  <div className="mt-3 rounded-lg border border-lacuna-lavender/30 bg-lacuna-lavender/10 p-3">
                    <p className="text-[11px] font-semibold text-lacuna-plum mb-1 uppercase tracking-wide">
                      WHO Cost-Effectiveness (illustrative)
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          result.whocea.category === "Very cost-effective"
                            ? "bg-emerald-100 text-emerald-700"
                            : result.whocea.category === "Cost-effective"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {result.whocea.category}
                      </span>
                      <span className="text-xs text-lacuna-blue/70">
                        ${result.whocea.illustrativeCostPerDALY?.toLocaleString()}/DALY averted
                      </span>
                    </div>
                    <p className="text-[10px] text-lacuna-blue/60 leading-relaxed">
                      {result.whocea.thresholdContext}
                    </p>
                    {/* Payer/provider access gap note */}
                    <p className="text-[10px] text-lacuna-blue/55 mt-1 leading-relaxed border-t border-lacuna-lavender/20 pt-1">
                      <span className="font-medium">Access gap:</span>{" "}
                      {result.whocea.providerGapNote}
                    </p>
                    {/* Assumption detail — stage-adjusted penetration + payer factor */}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-[10px] text-lacuna-blue/40">
                        Effective penetration:{" "}
                        {(result.whocea.effectivePenetration * 100).toFixed(2)}%
                        (stage base × {result.whocea.payerCoverageFactor.toFixed(2)}× payer factor)
                      </span>
                      <span className="text-[10px] text-lacuna-blue/40">
                        Program cost: ${result.whocea.programCostM.toFixed(1)}M
                      </span>
                      <span className="text-[10px] text-lacuna-blue/40">
                        DALYs averted: {result.whocea.dalysAvertedEstimate?.toLocaleString()} over 10 yr
                      </span>
                    </div>
                    <p className="text-[10px] text-lacuna-blue/35 mt-1 leading-relaxed">
                      Reference: WHO-CHOICE (Tan-Torres Edejer et al. 2003); US GDP/capita $76,330
                      (World Bank 2023). Not a formal ICER — illustrative framing only.
                    </p>
                  </div>
                )}

                <div className="mt-2 border-t border-lacuna-pink/20 pt-3">
                  <p className="text-xs text-lacuna-blue/50">{result.methodology}</p>
                  <CitationFootnotes ids={result.citationIds} />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  citationIds,
}: {
  label: string;
  value: string;
  citationIds?: string[];
}) {
  return (
    <div>
      <span className="text-lacuna-blue/60">{label}: </span>
      <span className="font-medium text-lacuna-plum">{value}</span>
      {citationIds && <CitationMarkers ids={citationIds} />}
    </div>
  );
}
