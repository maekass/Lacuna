"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { DiscreteSourceNote } from "@/components/DiscreteSources";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  computeVCSignalCounts,
  computeVCSignalExamples,
  computeWorkQueueVolumes,
  operatingModel,
  painPoints,
  type SegmentKey,
  segments,
  vcSignals,
  VC_SIGNAL_DEAL_COUNT_MODEL,
  WORK_QUEUE_MODEL_FOOTNOTE,
} from "@/data/payerOpsData";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  computeModeled,
  OPPORTUNITY_METRIC_MODELS,
  OPPORTUNITY_MODEL_FOOTNOTE,
} from "@/lib/payerOps/opportunityModel";
import {
  computeVcSignalDealFlow,
  VC_SIGNAL_MODEL_FOOTNOTE,
} from "@/lib/payerOps/vcSignalModel";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

const SECTION = "mb-16 scroll-mt-28";
const SECTION_DESC = "text-sm sm:text-base";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function parseLives(lives: string) {
  if (lives.endsWith("M")) return parseFloat(lives) * 1_000_000;
  if (lives.endsWith("K")) return parseFloat(lives) * 1_000;
  return parseFloat(lives);
}

function formatLivesCount(count: number) {
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${Math.round(count / 1_000)}K`;
  }
  return String(count);
}

function useAnimatedNumber(target: number, duration: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;

    let frameId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const next = Math.round(from + (target - from) * progress);
      valueRef.current = next;
      setValue(next);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        valueRef.current = target;
        setValue(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return value;
}

export default function PayerOpsPage() {
  const [segment, setSegment] = useState<SegmentKey>("commercial");
  const [compareAll, setCompareAll] = useState(false);
  const [customizeInputs, setCustomizeInputs] = useState(false);
  const [customSegment, setCustomSegment] = useState<
    (typeof segments)[SegmentKey] | null
  >(null);
  const [expandedDealSignal, setExpandedDealSignal] = useState<string | null>(
    null,
  );
  const selected = segments[segment];
  const [denialRate, setDenialRate] = useState(selected.denialRate);
  const [avoidableRate, setAvoidableRate] = useState(selected.avoidableRate);
  const activeSegment = customSegment ?? selected;
  const editingSegment = customSegment ?? segments[segment];

  function handleSegmentChange(key: SegmentKey) {
    setSegment(key);
    setDenialRate(segments[key].denialRate);
    setAvoidableRate(segments[key].avoidableRate);
    setCustomSegment(null);
  }

  function updateCustomSegment(
    patch: Partial<(typeof segments)[SegmentKey]>,
  ) {
    setCustomSegment((current) => ({
      ...(current ?? segments[segment]),
      ...patch,
    }));
    if (patch.denialRate !== undefined) {
      setDenialRate(patch.denialRate);
    }
    if (patch.avoidableRate !== undefined) {
      setAvoidableRate(patch.avoidableRate);
    }
  }

  function resetCustomSegment() {
    setCustomSegment(null);
    setDenialRate(segments[segment].denialRate);
    setAvoidableRate(segments[segment].avoidableRate);
  }

  const modeled = useMemo(() => {
    const effectiveDenialRate = customSegment?.denialRate ?? denialRate;
    const effectiveAvoidableRate = customSegment?.avoidableRate ??
      avoidableRate;
    return computeModeled(
      activeSegment,
      effectiveDenialRate,
      effectiveAvoidableRate,
    );
  }, [activeSegment, customSegment, denialRate, avoidableRate]);

  const allSegmentsModeled = useMemo(() => {
    if (!compareAll) return [];

    return (Object.keys(segments) as SegmentKey[]).map((key) => {
      const segmentData = segments[key];
      return {
        key,
        label: segmentData.label,
        lives: segmentData.lives,
        livesValue: parseLives(segmentData.lives),
        ...computeModeled(
          segmentData,
          segmentData.denialRate,
          segmentData.avoidableRate,
        ),
      };
    });
  }, [compareAll]);

  const animatedAvoidableDenials = useAnimatedNumber(
    modeled.avoidableDenials,
    400,
  );
  const animatedMonthlySavings = useAnimatedNumber(modeled.monthlySavings, 400);
  const animatedAuthHours = useAnimatedNumber(modeled.authHours, 400);

  const triageQueues = useMemo(
    () => computeWorkQueueVolumes(modeled.avoidableDenials),
    [modeled.avoidableDenials],
  );

  const { verifiedAcquisitions, verifiedCompanies } = useVerifiedDataset();

  const companySectorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of verifiedCompanies) {
      map.set(company.id, company.sector);
    }
    return map;
  }, [verifiedCompanies]);

  const vcSignalDealFlow = useMemo(
    () => computeVcSignalDealFlow(verifiedAcquisitions, companySectorById),
    [verifiedAcquisitions, companySectorById],
  );

  const dealCounts = useMemo(
    () => computeVCSignalCounts(verifiedAcquisitions, verifiedCompanies),
    [verifiedAcquisitions, verifiedCompanies],
  );

  const vcSignalExamples = useMemo(
    () => computeVCSignalExamples(verifiedAcquisitions, verifiedCompanies),
    [verifiedAcquisitions, verifiedCompanies],
  );

  return (
    <div>
      <header className="mb-10 overflow-hidden rounded-3xl border border-lacuna-lavender/40 bg-white/80 p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="lacuna-eyebrow text-xs font-semibold text-lacuna-blue">
              Portfolio project · healthcare payer administration
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-balance text-lacuna-plum sm:text-5xl">
              PayerOps Navigator
              <wbr />{" "}
              for reducing avoidable administrative waste
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-lacuna-blue sm:text-lg">
              A portfolio case study designed for payer operations roles. This
              concept shows how a health plan could combine workflow design,
              operational analytics, and governance controls to reduce
              prior-authorization and claims-administration friction without
              weakening oversight.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "Prior auth",
                "Claims ops",
                "Provider abrasion",
                "Appeals",
                "Rules governance",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-lacuna-lavender/40 bg-lacuna-lavender/15 px-3 py-1 text-sm font-medium text-lacuna-plum"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-lacuna-plum p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 text-sm font-semibold text-lacuna-pink">
              <Sparkles className="h-4 w-4" /> Role-fit signal
            </div>
            <p className="mt-3 text-2xl font-bold">
              Built to demonstrate payer operations fluency, product thinking,
              analytics, and implementation judgment.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Use the opportunity simulator below to model avoidable denial
              volume and admin savings by line of business. All segment inputs
              are hypothetical — swap in real plan data to generate a grounded
              business case.
            </p>
          </div>
        </div>
      </header>

      <MotionSection id="vc-signals" className={SECTION}>
        <SectionHeader
          title="Payer friction → VC investment thesis"
          description="Each payer administrative pain point is also an investment signal. This section maps the operational problems below to the M&A themes they generate — the lens a corporate VC would apply when evaluating women's health deal flow."
          descriptionClassName={SECTION_DESC}
        />
        <CuratedDatasetBanner className="mb-4" forceShow />
        <DiscreteSourceNote className="mb-4">
          {VC_SIGNAL_MODEL_FOOTNOTE}
        </DiscreteSourceNote>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vcSignals.map((s) => {
            const isExpanded = expandedDealSignal === s.painPoint;
            const flow = vcSignalDealFlow.byPainPoint[s.painPoint];
            const momentum = flow.momentum;
            const matchingDeals = dealCounts[s.painPoint] ?? 0;
            const examples = vcSignalExamples[s.painPoint] ?? [];

            return (
              <div
                key={s.painPoint}
                className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TrendingUp className="h-4 w-4 shrink-0 text-lacuna-blue" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-blue sm:text-xs">
                      {s.painPoint}
                    </span>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      momentum === "accelerating"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : momentum === "early"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-lacuna-lavender/20 text-lacuna-plum/70 border border-lacuna-lavender/30"
                    }`}
                  >
                    {momentum === "accelerating"
                      ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse"
                          aria-hidden="true"
                        />
                      )
                      : null}
                    {momentum === "early" ? "early stage" : momentum}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-lacuna-blue">
                  {s.thesis}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDealSignal(isExpanded ? null : s.painPoint)}
                  className="mt-2 cursor-pointer text-xs font-medium text-lacuna-plum underline-offset-2 hover:underline"
                >
                  {isExpanded ? "Hide ↑" : "Show deal signal ↓"}
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded
                    ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex items-start gap-2 rounded-xl bg-lacuna-lavender/10 p-3">
                          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lacuna-plum" />
                          <div>
                            <p className="text-xs leading-relaxed text-lacuna-plum">
                              {s.dealSignal}
                            </p>
                            {examples.map((example) => (
                              <div
                                key={`${example.targetName}-${example.year}`}
                              >
                                <p className="mt-2 text-[11px] text-lacuna-plum/70">
                                  {example.targetName} → {example.acquirerName}
                                  {" "}
                                  ({example.year})
                                </p>
                                {example.rationale
                                  ? (
                                    <p className="mt-1 text-[10px] italic text-lacuna-plum/60 leading-snug">
                                      &ldquo;{example.rationale.slice(0, 120)}
                                      {example.rationale.length > 120
                                        ? "…"
                                        : ""}
                                      &rdquo;
                                    </p>
                                  )
                                  : null}
                              </div>
                            ))}
                            {matchingDeals > 0
                              ? (
                                <ModelProvenanceHint
                                  model={VC_SIGNAL_DEAL_COUNT_MODEL}
                                >
                                  <p className="mt-2 cursor-help text-[11px] text-lacuna-plum/70">
                                    {matchingDeals}{" "}
                                    matching deal{matchingDeals ===
                                        1
                                      ? ""
                                      : "s"} in dataset
                                  </p>
                                </ModelProvenanceHint>
                              )
                              : null}
                          </div>
                        </div>
                      </motion.div>
                    )
                    : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </MotionSection>

      <MotionSection id="problem" className={SECTION}>
        <SectionHeader
          title="The operational problem"
          description="A meaningful share of payer administrative cost is created by preventable defects: incomplete documentation, benefit ambiguity, coding mismatches, manual routing, and inconsistent policy interpretation."
          descriptionClassName={SECTION_DESC}
        />
        <DiscreteSourceNote className="mb-4">
          External published benchmarks — cited per card (AMA, KFF/AHA, CMS).
          Not from the Lacuna verified M&A dataset.
        </DiscreteSourceNote>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {painPoints.map(({ title, value, detail, source, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <Icon className="h-6 w-6 text-lacuna-blue" />
              <div className="mt-4 text-3xl font-bold text-lacuna-plum">
                {value}
              </div>
              <h3 className="mt-2 font-semibold text-lacuna-plum">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-lacuna-blue">
                {detail}
              </p>
              {source
                ? (
                  <span className="mt-2 inline-block rounded-full bg-lacuna-lavender/20 px-2 py-0.5 text-[10px] font-medium text-lacuna-blue/70">
                    {source}
                  </span>
                )
                : null}
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="simulator" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Opportunity simulator"
          description="A lightweight business-case model using hypothetical plan inputs. Swap in real enrollment, denial, and cost-per-touch data to generate a grounded estimate."
          descriptionClassName={SECTION_DESC}
        />
        <div className="rounded-3xl border border-white/10 bg-lacuna-plum p-6 shadow-sm">
          <div className="relative after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-10 after:bg-gradient-to-l after:from-lacuna-plum after:to-transparent after:content-[''] sm:after:hidden">
            <div
              className="hide-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto"
              role="group"
              aria-label="Line of business"
            >
              {(Object.keys(segments) as SegmentKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSegmentChange(key)}
                  aria-label={segments[key].label}
                  aria-pressed={segment === key}
                  title={segments[key].label}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    segment === key
                      ? "bg-white text-lacuna-plum"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <span className="sm:hidden">{segments[key].shortLabel}</span>
                  <span className="hidden sm:inline">
                    {segments[key].label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCompareAll((active) => !active)}
                aria-pressed={compareAll}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  compareAll
                    ? "bg-white text-lacuna-plum"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Compare all segments
              </button>
            </div>
          </div>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setCustomizeInputs((active) => !active)}
              className="text-xs font-medium text-white/60 underline-offset-2 hover:text-white hover:underline"
            >
              {customizeInputs ? "Hide custom inputs" : "Customize inputs"}
            </button>
          </div>
          {customizeInputs
            ? (
              <div className="mt-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    <span>Lives count</span>
                    <input
                      type="number"
                      min={0}
                      value={parseLives(editingSegment.lives)}
                      onChange={(e) =>
                        updateCustomSegment({
                          lives: formatLivesCount(Number(e.target.value)),
                        })}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    <span>Monthly auths</span>
                    <input
                      type="number"
                      min={0}
                      value={editingSegment.auths}
                      onChange={(e) =>
                        updateCustomSegment({
                          auths: Number(e.target.value),
                        })}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    <span>Monthly claims</span>
                    <input
                      type="number"
                      min={0}
                      value={editingSegment.claims}
                      onChange={(e) =>
                        updateCustomSegment({
                          claims: Number(e.target.value),
                        })}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    <span>Denial rate %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={editingSegment.denialRate}
                      onChange={(e) =>
                        updateCustomSegment({
                          denialRate: Number(e.target.value),
                        })}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    <span>Avoidable fraction %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={editingSegment.avoidableRate}
                      onChange={(e) =>
                        updateCustomSegment({
                          avoidableRate: Number(e.target.value),
                        })}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    <span>Admin cost $</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editingSegment.adminCost}
                      onChange={(e) =>
                        updateCustomSegment({
                          adminCost: Number(e.target.value),
                        })}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                {customSegment
                  ? (
                    <button
                      type="button"
                      onClick={resetCustomSegment}
                      className="mt-3 text-xs font-medium text-lacuna-blue underline-offset-2 hover:underline"
                    >
                      Reset to defaults
                    </button>
                  )
                  : null}
              </div>
            )
            : null}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="denial-rate"
                className="mb-1 flex flex-col gap-1 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>Denial rate</span>
                <span className="font-semibold text-white sm:text-right">
                  {denialRate.toFixed(1)}%
                </span>
              </label>
              <input
                id="denial-rate"
                type="range"
                min={5}
                max={25}
                step={0.5}
                value={denialRate}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setDenialRate(next);
                  if (customSegment) {
                    updateCustomSegment({ denialRate: next });
                  }
                }}
                className="h-2 w-full touch-pan-x accent-lacuna-plum"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-white/45">
                <span>5%</span>
                <span>25%</span>
              </div>
            </div>
            <div>
              <label
                htmlFor="avoidable-rate"
                className="mb-1 flex flex-col gap-1 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>Avoidable fraction</span>
                <span className="font-semibold text-white sm:text-right">
                  {avoidableRate}%
                </span>
              </label>
              <input
                id="avoidable-rate"
                type="range"
                min={10}
                max={60}
                step={1}
                value={avoidableRate}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setAvoidableRate(next);
                  if (customSegment) {
                    updateCustomSegment({ avoidableRate: next });
                  }
                }}
                className="h-2 w-full touch-pan-x accent-lacuna-plum"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-white/45">
                <span>10%</span>
                <span>60%</span>
              </div>
            </div>
          </div>
          {compareAll
            ? <SegmentComparisonTable rows={allSegmentsModeled} />
            : (
              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <Metric
                  label="Covered lives (hypothetical)"
                  value={activeSegment.lives}
                  theme="dark"
                  model={OPPORTUNITY_METRIC_MODELS.coveredLives}
                />
                <Metric
                  label="Monthly avoidable denials"
                  value={formatNumber(animatedAvoidableDenials)}
                  theme="dark"
                  model={OPPORTUNITY_METRIC_MODELS.avoidableDenials}
                />
                <Metric
                  label="Monthly admin savings"
                  value={`$${formatNumber(animatedMonthlySavings)}`}
                  theme="dark"
                  model={OPPORTUNITY_METRIC_MODELS.monthlySavings}
                  valueLive="polite"
                />
                <Metric
                  label="Auth review hours freed"
                  value={formatNumber(animatedAuthHours)}
                  theme="dark"
                  model={OPPORTUNITY_METRIC_MODELS.authHours}
                />
              </div>
            )}
          <p className="mt-4 text-xs text-white/45 leading-relaxed">
            {OPPORTUNITY_MODEL_FOOTNOTE}
          </p>
        </div>
      </MotionSection>

      <MotionSection id="triage" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Operational triage design"
          description="The project demonstrates how a payer operations team could prioritize work by preventability, risk, automation readiness, and financial impact."
          descriptionClassName={SECTION_DESC}
        />
        <DiscreteSourceNote className="mb-4">
          {WORK_QUEUE_MODEL_FOOTNOTE}
        </DiscreteSourceNote>
        <p className="mb-4 text-sm text-lacuna-blue/70">
          Queue structure, automation readiness, and impact labels are
          illustrative workflow design. Volumes update from the opportunity
          simulator model above.
        </p>
        <div>
          <div className="grid gap-4 lg:hidden">
            {triageQueues.map((queue) => (
              <div
                key={queue.name}
                className="rounded-2xl border border-lacuna-lavender/35 bg-white p-4 shadow-sm"
              >
                <div className="font-semibold text-lacuna-plum">
                  {queue.name}
                </div>
                <p className="mt-1 text-sm text-lacuna-blue">{queue.action}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatChip
                    label="Volume"
                    value={formatNumber(queue.volume)}
                  />
                  <StatChip
                    label="Impact"
                    value={queue.impact}
                  />
                  <StatChip
                    label="Automation"
                    value={`${queue.automation}%`}
                    progress={queue.automation}
                  />
                  <StatChip label="Risk" value={queue.risk} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden rounded-3xl border border-lacuna-lavender/40 bg-white shadow-sm lg:block">
            <div className="grid grid-cols-12 gap-3 border-b border-lacuna-lavender/30 bg-lacuna-lavender/10 p-4 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
              <span className="col-span-4">Queue</span>
              <span className="col-span-2">Volume</span>
              <span className="col-span-2">Automation</span>
              <span className="col-span-2">Risk</span>
              <span className="col-span-2">Impact</span>
            </div>
            {triageQueues.map((queue) => (
              <div
                key={queue.name}
                className="grid grid-cols-12 gap-3 border-b border-lacuna-lavender/20 p-4 last:border-b-0"
              >
                <div className="col-span-4">
                  <div className="font-semibold text-lacuna-plum">
                    {queue.name}
                  </div>
                  <div className="mt-1 text-sm text-lacuna-blue">
                    {queue.action}
                  </div>
                </div>
                <div className="col-span-2 text-lacuna-plum">
                  {formatNumber(queue.volume)}
                </div>
                <div className="group relative col-span-2">
                  <div className="h-2 rounded-full bg-lacuna-lavender/20">
                    <div
                      className="h-2 rounded-full bg-lacuna-blue"
                      style={{ width: `${queue.automation}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-lacuna-blue">
                    {queue.automation}% ready
                  </div>
                  <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 w-48 rounded-lg bg-lacuna-plum px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {queue.action}
                  </div>
                </div>
                <div className="col-span-2 text-lacuna-plum">{queue.risk}</div>
                <div className="col-span-2 font-semibold text-lacuna-plum">
                  {queue.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection id="solution" delay={0.15} className={SECTION}>
        <SectionHeader
          title="Solution architecture"
          description="The concept is intentionally framed as a responsible workflow layer, not a black-box denial engine."
          descriptionClassName={SECTION_DESC}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {operatingModel.map((item, index) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lacuna-pink/30 font-bold text-lacuna-plum">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-lacuna-plum mb-1">
                  {item.title}
                </p>
                <p className="leading-relaxed text-lacuna-blue">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="governance" delay={0.2} className={SECTION}>
        <SectionHeader
          title="Governance and safeguards"
          description="The strongest portfolio signal is showing where automation should stop."
          descriptionClassName={SECTION_DESC}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Capability
            icon={ShieldCheck}
            title="Audit trail"
            text="Every recommendation stores policy version, source fields, confidence, reviewer action, and override reason."
          />
          <Capability
            icon={Stethoscope}
            title="Clinician-in-loop"
            text="High-risk medical necessity, specialty pharmacy, and vulnerable-population cases stay in expert review."
          />
          <Capability
            icon={AlertTriangle}
            title="Bias monitoring"
            text="Dashboards compare overturn rates, processing time, and missing-doc burden across geography and provider type."
          />
        </div>
      </MotionSection>
    </div>
  );
}

function SegmentComparisonTable({
  rows,
}: {
  rows: Array<{
    key: SegmentKey;
    label: string;
    lives: string;
    livesValue: number;
    avoidableDenials: number;
    monthlySavings: number;
    authHours: number;
  }>;
}) {
  const maxLives = Math.max(...rows.map((row) => row.livesValue));
  const maxAvoidableDenials = Math.max(
    ...rows.map((row) => row.avoidableDenials),
  );
  const maxMonthlySavings = Math.max(...rows.map((row) => row.monthlySavings));
  const maxAuthHours = Math.max(...rows.map((row) => row.authHours));

  function cellClass(isHighest: boolean) {
    return isHighest ? "bg-white/20 font-semibold text-white" : "text-white/90";
  }

  return (
    <div className="relative mt-6 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-10 after:bg-gradient-to-l after:from-lacuna-plum after:to-transparent after:content-[''] sm:after:hidden">
      <div className="hide-scrollbar overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[560px] overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-5 gap-3 border-b border-white/10 bg-white/10 p-4 text-xs font-semibold uppercase tracking-wide text-white/70">
            <span>Segment</span>
            <span>Covered lives</span>
            <span>Avoidable denials</span>
            <span>Admin savings</span>
            <span>Auth hours</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-5 gap-3 border-b border-white/10 p-4 text-sm last:border-b-0"
            >
              <div className="font-semibold text-white">{row.label}</div>
              <div className={cellClass(row.livesValue === maxLives)}>
                {row.lives}
              </div>
              <div
                className={cellClass(
                  row.avoidableDenials === maxAvoidableDenials,
                )}
              >
                {formatNumber(row.avoidableDenials)}
              </div>
              <div
                className={cellClass(row.monthlySavings === maxMonthlySavings)}
              >
                ${formatNumber(row.monthlySavings)}
              </div>
              <div className={cellClass(row.authHours === maxAuthHours)}>
                {formatNumber(row.authHours)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl bg-lacuna-surface-subtle px-2 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-lacuna-blue">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-lacuna-plum">
        {value}
      </div>
      {progress !== undefined
        ? (
          <div className="mt-1.5 h-1 rounded-full bg-lacuna-lavender/20">
            <div
              className="h-1 rounded-full bg-lacuna-blue"
              style={{ width: `${progress}%` }}
            />
          </div>
        )
        : null}
    </div>
  );
}

function Metric({
  label,
  value,
  theme = "light",
  model,
  valueLive,
}: {
  label: string;
  value: string;
  theme?: "light" | "dark";
  model?: ModelProvenance;
  valueLive?: "polite";
}) {
  const inner = theme === "dark"
    ? (
      <div
        className={`rounded-2xl bg-white/10 p-5 ${model ? "cursor-help" : ""}`}
      >
        <div className="text-sm font-semibold text-white/60">{label}</div>
        <div
          className="mt-2 text-3xl font-bold text-white"
          aria-live={valueLive}
        >
          {value}
        </div>
      </div>
    )
    : (
      <div
        className={`rounded-2xl bg-lacuna-surface-subtle p-5 ${
          model ? "cursor-help" : ""
        }`}
      >
        <div className="text-sm font-semibold text-lacuna-blue">{label}</div>
        <div
          className="mt-2 text-3xl font-bold text-lacuna-plum"
          aria-live={valueLive}
        >
          {value}
        </div>
      </div>
    );

  if (!model) return inner;

  return <ModelProvenanceHint model={model}>{inner}</ModelProvenanceHint>;
}

function Capability(
  { icon: Icon, title, text }: {
    icon: typeof CheckCircle2;
    title: string;
    text: string;
  },
) {
  return (
    <div className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm">
      <Icon className="h-6 w-6 text-lacuna-blue" />
      <h3 className="mt-4 text-lg font-bold text-lacuna-plum">{title}</h3>
      <p className="mt-2 leading-relaxed text-lacuna-blue">{text}</p>
    </div>
  );
}
