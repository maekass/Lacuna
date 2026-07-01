"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Hospital,
  Network,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";

const SECTION = "mb-16 scroll-mt-28";

type SegmentKey = "commercial" | "medicaid" | "medicare";

const segments: Record<SegmentKey, {
  label: string;
  lives: string;
  auths: number;
  claims: number;
  denialRate: number;
  avoidableRate: number;
  adminCost: number;
}> = {
  commercial: {
    label: "Commercial ASO + fully insured",
    lives: "1.8M",
    auths: 18400,
    claims: 920000,
    denialRate: 10.8,
    avoidableRate: 31,
    adminCost: 5.8,
  },
  medicaid: {
    label: "Medicaid managed care",
    lives: "910K",
    auths: 12200,
    claims: 610000,
    denialRate: 13.6,
    avoidableRate: 38,
    adminCost: 6.9,
  },
  medicare: {
    label: "Medicare Advantage",
    lives: "420K",
    auths: 8100,
    claims: 380000,
    denialRate: 15.1,
    avoidableRate: 34,
    adminCost: 7.4,
  },
};

const painPoints = [
  {
    title: "Prior authorization rework",
    value: "~40%",
    detail:
      "of pended requests require additional clinical documentation",
    source: "AMA 2023 Prior Auth Survey",
    icon: ClipboardCheck,
  },
  {
    title: "Claim denial reversals",
    value: "40–75%",
    detail:
      "of appealed denials are overturned on review — wide range by plan and service type",
    source: "KFF / AHA denial appeals data",
    icon: FileSearch,
  },
  {
    title: "Provider abrasion",
    value: "3–17 days",
    detail:
      "typical prior-auth cycle time; non-urgent requests can exceed 30 days",
    source: "CMS 2023 prior authorization data",
    icon: Hospital,
  },
  {
    title: "Fragmented rules",
    value: "Many systems",
    detail:
      "policy, benefit, network, medical-necessity, and claim-edit rules held in separate platforms",
    icon: Network,
  },
];

const workQueues = [
  {
    name: "Musculoskeletal imaging prior auth",
    volume: 1842,
    automation: 64,
    risk: "Low",
    impact: "$1.4M",
    action: "Auto-approve guideline-concordant requests with complete notes",
  },
  {
    name: "Behavioral health professional claims",
    volume: 1268,
    automation: 51,
    risk: "Medium",
    impact: "$920K",
    action: "Route coding mismatches to provider self-correction before denial",
  },
  {
    name: "Maternal episode coordination",
    volume: 732,
    automation: 43,
    risk: "Medium",
    impact: "$680K",
    action:
      "Detect missing referrals and attach benefit-aware next-best action",
  },
  {
    name: "Specialty pharmacy exceptions",
    volume: 516,
    automation: 29,
    risk: "High",
    impact: "$2.1M",
    action: "Keep clinician-in-loop, summarize evidence, and audit decisions",
  },
];

const operatingModel = [
  "Ingest X12 278/837 status, policy rules, benefits, network files, and notes metadata",
  "Score each case for administrative preventability, clinical risk, SLA urgency, and provider friction",
  "Resolve low-risk administrative defects before denial with provider-facing next-best actions",
  "Escalate clinically sensitive cases with evidence packets and auditable rationale",
];

const vcSignals = [
  {
    painPoint: "Prior-auth digitization",
    thesis:
      "Payers spend an estimated $6–9 per manual auth transaction (CAQH index). Companies that auto-adjudicate routine requests reduce medical loss ratio and provider abrasion simultaneously.",
    dealSignal:
      "Payers and PBMs are active acquirers; strategic rationale is direct cost offset, commanding premiums above pure-financial comps.",
    momentum: "accelerating" as const,
  },
  {
    painPoint: "Maternal episode coordination",
    thesis:
      "Unmanaged maternal episodes cost commercial payers $12K–$27K per birth (HRSA/Milliman range). Point solutions reducing avoidable readmissions convert admin spend into member retention.",
    dealSignal:
      "Hospital systems and payers both acquiring; dual-buyer dynamic supports valuation. Lacuna dataset shows meaningful maternal-category deal flow.",
    momentum: "accelerating" as const,
  },
  {
    painPoint: "Behavioral health parity",
    thesis:
      "Mental health claim denial rates run higher than medical/surgical equivalents — a documented regulatory and PR liability. BH navigation platforms reducing out-of-network leakage are strategic for large commercial plans.",
    dealSignal:
      "Rapid consolidation since 2021 driven by parity mandates and post-pandemic demand. One of the highest-velocity M&A categories in women's and general health.",
    momentum: "accelerating" as const,
  },
  {
    painPoint: "Specialty pharmacy exceptions",
    thesis:
      "Step-therapy and quantity-limit exceptions generate the highest admin cost per case and greatest clinical risk if mis-routed. AI-assisted exception management is early-stage with limited M&A comparables.",
    dealSignal:
      "Sparse deal history — mostly pre-Series B. Limited comparables means first-mover investors set valuation norms rather than follow them.",
    momentum: "early" as const,
  },
];

const progressWidths: Record<number, string> = {
  29: "w-[29%]",
  43: "w-[43%]",
  51: "w-[51%]",
  64: "w-[64%]",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
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
  const t = useTranslations("pages.payerOps");
  const [segment, setSegment] = useState<SegmentKey>("commercial");
  const selected = segments[segment];
  const [denialRate, setDenialRate] = useState(selected.denialRate);
  const [avoidableRate, setAvoidableRate] = useState(selected.avoidableRate);

  function handleSegmentChange(key: SegmentKey) {
    setSegment(key);
    setDenialRate(segments[key].denialRate);
    setAvoidableRate(segments[key].avoidableRate);
  }

  const modeled = useMemo(() => {
    const avoidableDenials = Math.round(
      selected.claims * (denialRate / 100) *
        (avoidableRate / 100),
    );
    // adminCost is cost per avoidable denial in dollars (CAQH admin index)
    const monthlySavings = Math.round(avoidableDenials * selected.adminCost);
    const authHours = Math.round(selected.auths * 0.22);
    return { avoidableDenials, monthlySavings, authHours };
  }, [selected, denialRate, avoidableRate]);

  const animatedAvoidableDenials = useAnimatedNumber(
    modeled.avoidableDenials,
    400,
  );
  const animatedMonthlySavings = useAnimatedNumber(modeled.monthlySavings, 400);
  const animatedAuthHours = useAnimatedNumber(modeled.authHours, 400);

  return (
    <div>
      <header className="mb-10 overflow-hidden rounded-3xl border border-lacuna-lavender/40 bg-white/80 p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="lacuna-eyebrow text-xs font-semibold text-lacuna-blue">
              Portfolio project · healthcare payer administration
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-lacuna-plum sm:text-5xl">
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
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vcSignals.map((s) => (
            <div
              key={s.painPoint}
              className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0 text-lacuna-blue" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
                    {s.painPoint}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    s.momentum === "accelerating"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : s.momentum === "early"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-lacuna-lavender/20 text-lacuna-plum/70 border border-lacuna-lavender/30"
                  }`}
                >
                  {s.momentum === "early" ? "early stage" : s.momentum}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-lacuna-blue">
                {s.thesis}
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-lacuna-lavender/10 p-3">
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lacuna-plum" />
                <p className="text-xs leading-relaxed text-lacuna-plum">
                  {s.dealSignal}
                </p>
              </div>
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="problem" className={SECTION}>
        <SectionHeader
          title="The operational problem"
          description="A meaningful share of payer administrative cost is created by preventable defects: incomplete documentation, benefit ambiguity, coding mismatches, manual routing, and inconsistent policy interpretation."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        />
        <div className="rounded-3xl border border-lacuna-lavender/40 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(segments) as SegmentKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSegmentChange(key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  segment === key
                    ? "bg-lacuna-plum text-white"
                    : "bg-lacuna-lavender/15 text-lacuna-plum hover:bg-lacuna-lavender/25"
                }`}
              >
                {segments[key].label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="denial-rate"
                className="mb-1 flex items-baseline justify-between text-sm text-lacuna-blue"
              >
                <span>Denial rate</span>
                <span className="font-semibold text-lacuna-plum">
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
                className="w-full accent-lacuna-plum"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-lacuna-blue/50">
                <span>5%</span>
                <span>25%</span>
              </div>
            </div>
            <div>
              <label
                htmlFor="avoidable-rate"
                className="mb-1 flex items-baseline justify-between text-sm text-lacuna-blue"
              >
                <span>Avoidable fraction</span>
                <span className="font-semibold text-lacuna-plum">
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
                className="w-full accent-lacuna-plum"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-lacuna-blue/50">
                <span>10%</span>
                <span>60%</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <Metric
              label="Covered lives (hypothetical)"
              value={selected.lives}
            />
            <Metric
              label="Monthly avoidable denials"
              value={formatNumber(animatedAvoidableDenials)}
            />
            <Metric
              label="Monthly admin savings"
              value={`$${formatNumber(animatedMonthlySavings)}`}
            />
            <Metric
              label="Auth review hours freed"
              value={formatNumber(animatedAuthHours)}
            />
          </div>
          <p className="mt-4 text-xs text-lacuna-blue/60 leading-relaxed">
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
        />
        <p className="mb-4 text-sm text-lacuna-blue/70">
          Example queue structure — volumes, automation readiness, and impact
          figures are illustrative, not measured operational data.
        </p>
        <div className="grid gap-4 lg:hidden">
          {workQueues.map((queue) => (
            <div
              key={queue.name}
              className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <div className="font-semibold text-lacuna-plum">{queue.name}</div>
              <p className="mt-1 text-sm leading-relaxed text-lacuna-blue">
                {queue.action}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatChip
                  label="Volume"
                  value={formatNumber(queue.volume)}
                />
                <StatChip
                  label="Automation"
                  value={`${queue.automation}%`}
                />
                <StatChip label="Risk" value={queue.risk} />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-3xl border border-lacuna-lavender/40 bg-white shadow-sm lg:block">
          <div className="grid grid-cols-12 gap-3 border-b border-lacuna-lavender/30 bg-lacuna-lavender/10 p-4 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
            <span className="col-span-4">Queue</span>
            <span className="col-span-2">Volume</span>
            <span className="col-span-2">Automation</span>
            <span className="col-span-2">Risk</span>
            <span className="col-span-2">Impact</span>
          </div>
          {workQueues.map((queue) => (
            <div
              key={queue.name}
              className="grid grid-cols-12 gap-3 border-b border-lacuna-lavender/20 p-4 last:border-b-0"
            >
              <div className="col-span-12 lg:col-span-4">
                <div className="font-semibold text-lacuna-plum">
                  {queue.name}
                </div>
                <div className="mt-1 text-sm text-lacuna-blue">
                  {queue.action}
                </div>
              </div>
              <div className="col-span-3 lg:col-span-2 text-lacuna-plum">
                {formatNumber(queue.volume)}
              </div>
              <div className="col-span-3 lg:col-span-2">
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
              </div>
              <div className="col-span-3 lg:col-span-2 text-lacuna-plum">
                {queue.risk}
              </div>
              <div className="col-span-3 lg:col-span-2 font-semibold text-lacuna-plum">
                {queue.impact}
              </div>
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="solution" delay={0.15} className={SECTION}>
        <SectionHeader
          title="Solution architecture"
          description="The concept is intentionally framed as a responsible workflow layer, not a black-box denial engine."
        />
        <div className="grid gap-4 lg:grid-cols-2">
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
        />
        <div className="grid gap-4 md:grid-cols-3">
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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-lacuna-surface-subtle px-2 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-lacuna-blue">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-lacuna-plum">
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
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
