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
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  computeWorkQueueVolumes,
  operatingModel,
  painPoints,
  progressWidths,
  segments,
  type SegmentData,
  type SegmentKey,
  vcSignals,
} from "@/data/payerOpsData";

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

function computeModeled(
  segmentData: SegmentData,
  denialRate: number,
  avoidableRate: number,
) {
  const avoidableDenials = Math.round(
    segmentData.claims * (denialRate / 100) * (avoidableRate / 100),
  );
  const monthlySavings = Math.round(avoidableDenials * segmentData.adminCost);
  const authHours = Math.round(segmentData.auths * 0.22);
  return { avoidableDenials, monthlySavings, authHours };
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
  const [expandedDealSignal, setExpandedDealSignal] = useState<string | null>(
    null,
  );
  const selected = segments[segment];
  const [denialRate, setDenialRate] = useState(selected.denialRate);
  const [avoidableRate, setAvoidableRate] = useState(selected.avoidableRate);

  function handleSegmentChange(key: SegmentKey) {
    setSegment(key);
    setDenialRate(segments[key].denialRate);
    setAvoidableRate(segments[key].avoidableRate);
  }

  const modeled = useMemo(() => {
    return computeModeled(selected, denialRate, avoidableRate);
  }, [selected, denialRate, avoidableRate]);

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

  return (
    <div>
      <header className="mb-10 overflow-hidden rounded-3xl border border-lacuna-lavender/40 bg-white/80 p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="lacuna-eyebrow text-xs font-semibold text-lacuna-blue">
              Portfolio project · healthcare payer administration
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-lacuna-plum sm:text-5xl">
              PayerOps Navigator for reducing avoidable administrative waste
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-lacuna-blue">
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vcSignals.map((s) => {
            const isExpanded = expandedDealSignal === s.painPoint;

            return (
            <div
              key={s.painPoint}
              className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0 text-lacuna-blue" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-blue sm:text-xs">
                    {s.painPoint}
                  </span>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    s.momentum === "accelerating"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : s.momentum === "early"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-lacuna-lavender/20 text-lacuna-plum/70 border border-lacuna-lavender/30"
                  }`}
                >
                  {s.momentum === "accelerating" ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse"
                      aria-hidden="true"
                    />
                  ) : null}
                  {s.momentum === "early" ? "early stage" : s.momentum}
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
                {isExpanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-lacuna-lavender/10 p-3">
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lacuna-plum" />
                      <p className="text-xs leading-relaxed text-lacuna-plum">
                        {s.dealSignal}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
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
              {source ? (
                <span className="mt-2 inline-block rounded-full bg-lacuna-lavender/20 px-2 py-0.5 text-[10px] font-medium text-lacuna-blue/70">
                  {source}
                </span>
              ) : null}
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
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(segments) as SegmentKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSegmentChange(key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  segment === key
                    ? "bg-white text-lacuna-plum"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {segments[key].label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCompareAll((active) => !active)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                compareAll
                  ? "bg-white text-lacuna-plum"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Compare all segments
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="denial-rate"
                className="mb-1 flex flex-col gap-1 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>Denial rate</span>
                <span className="font-semibold text-lacuna-plum sm:text-right">
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
                onChange={(e) => setDenialRate(Number(e.target.value))}
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
                <span className="font-semibold text-lacuna-plum sm:text-right">
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
                onChange={(e) => setAvoidableRate(Number(e.target.value))}
                className="h-2 w-full touch-pan-x accent-lacuna-plum"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-white/45">
                <span>10%</span>
                <span>60%</span>
              </div>
            </div>
          </div>
          {compareAll ? (
            <SegmentComparisonTable rows={allSegmentsModeled} />
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <Metric
                label="Covered lives (hypothetical)"
                value={selected.lives}
                theme="dark"
              />
              <Metric
                label="Monthly avoidable denials"
                value={formatNumber(animatedAvoidableDenials)}
                theme="dark"
              />
              <Metric
                label="Monthly admin savings"
                value={`$${formatNumber(animatedMonthlySavings)}`}
                theme="dark"
              />
              <Metric
                label="Auth review hours freed"
                value={formatNumber(animatedAuthHours)}
                theme="dark"
              />
            </div>
          )}
          <p className="mt-4 text-xs text-white/45 leading-relaxed">
            Model: avoidable denials = monthly claims × denial rate × avoidable
            fraction. Admin savings = avoidable denials × cost per manual touch
            (CAQH index). Auth hours = monthly auths × 0.22 hrs/touch. All
            inputs are hypothetical; denial and avoidable-rate assumptions drawn
            from published industry benchmarks.
          </p>
        </div>
      </MotionSection>

      <MotionSection id="triage" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Operational triage design"
          description="The project demonstrates how a payer operations team could prioritize work by preventability, risk, automation readiness, and financial impact."
          descriptionClassName={SECTION_DESC}
        />
        <p className="mb-4 text-sm text-lacuna-blue/70">
          Example queue structure — volumes, automation readiness, and impact
          figures are illustrative, not measured operational data.
        </p>
        <div>
          <div className="grid gap-4 lg:hidden">
            {triageQueues.map((queue) => (
              <div
                key={queue.name}
                className="rounded-2xl border border-lacuna-lavender/35 bg-white p-4 shadow-sm"
              >
                <div className="font-semibold text-lacuna-plum">{queue.name}</div>
                <p className="mt-1 text-sm text-lacuna-blue">{queue.action}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StatChip
                    label="Volume"
                    value={formatNumber(queue.volume)}
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
                      className={`h-2 rounded-full bg-lacuna-blue ${
                        progressWidths[queue.automation]
                      }`}
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
              key={item}
              className="flex gap-4 rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lacuna-pink/30 font-bold text-lacuna-plum">
                {index + 1}
              </div>
              <p className="leading-relaxed text-lacuna-blue">{item}</p>
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
    return isHighest
      ? "bg-white/20 font-semibold text-white"
      : "text-white/90";
  }

  return (
    <div className="relative mt-6">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
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
              <div className={cellClass(row.livesValue === maxLives)}>{row.lives}</div>
              <div className={cellClass(row.avoidableDenials === maxAvoidableDenials)}>
                {formatNumber(row.avoidableDenials)}
              </div>
              <div className={cellClass(row.monthlySavings === maxMonthlySavings)}>
                ${formatNumber(row.monthlySavings)}
              </div>
              <div className={cellClass(row.authHours === maxAuthHours)}>
                {formatNumber(row.authHours)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-lacuna-plum to-transparent sm:hidden"
      />
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
      {progress !== undefined ? (
        <div className="mt-1.5 h-1 rounded-full bg-lacuna-lavender/20">
          <div
            className={`h-1 rounded-full bg-lacuna-blue ${
              progressWidths[progress]
            }`}
          />
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  theme = "light",
}: {
  label: string;
  value: string;
  theme?: "light" | "dark";
}) {
  if (theme === "dark") {
    return (
      <div className="rounded-2xl bg-white/10 p-5">
        <div className="text-sm font-semibold text-white/60">{label}</div>
        <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-lacuna-surface-subtle p-5">
      <div className="text-sm font-semibold text-lacuna-blue">{label}</div>
      <div className="mt-2 text-3xl font-bold text-lacuna-plum">{value}</div>
    </div>
  );
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
