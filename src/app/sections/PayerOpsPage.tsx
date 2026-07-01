"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Hospital,
  Network,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
    value: "42%",
    detail: "of pended requests need missing clinical documentation follow-up",
    icon: ClipboardCheck,
  },
  {
    title: "Claim denial reversals",
    value: "28%",
    detail: "of appealed denials are overturned after manual review",
    icon: FileSearch,
  },
  {
    title: "Provider abrasion",
    value: "19 days",
    detail: "median cycle time from first submission to final determination",
    icon: Hospital,
  },
  {
    title: "Fragmented rules",
    value: "6 systems",
    detail: "hold policy, benefit, network, medical-necessity, and claim edits",
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

const roadmap = [
  {
    phase: "0-30 days",
    title: "Discovery",
    detail:
      "Map denial reason codes, pended auth categories, appeal overturns, and SLA hotspots.",
  },
  {
    phase: "31-60 days",
    title: "Pilot",
    detail:
      "Launch two queues with human review, audit sampling, and provider office feedback loops.",
  },
  {
    phase: "61-90 days",
    title: "Scale",
    detail:
      "Expand rules library, automate low-risk approvals, and report savings by line of business.",
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

export default function PayerOpsPage() {
  const t = useTranslations("pages.payerOps");
  const [segment, setSegment] = useState<SegmentKey>("commercial");
  const selected = segments[segment];
  const modeled = useMemo(() => {
    const avoidableDenials = Math.round(
      selected.claims * (selected.denialRate / 100) *
        (selected.avoidableRate / 100),
    );
    const monthlySavings = Math.round(
      avoidableDenials * selected.adminCost * 100,
    );
    const authHours = Math.round(selected.auths * 0.22);
    return { avoidableDenials, monthlySavings, authHours };
  }, [selected]);

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
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-2xl font-bold">18%</div>
                <div className="text-white/75">
                  modeled cycle-time reduction
                </div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-2xl font-bold">$5.1M</div>
                <div className="text-white/75">
                  illustrative annual admin opportunity
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <MotionSection id="problem" className={SECTION}>
        <SectionHeader
          title="The operational problem"
          description="A meaningful share of payer administrative cost is created by preventable defects: incomplete documentation, benefit ambiguity, coding mismatches, manual routing, and inconsistent policy interpretation."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {painPoints.map(({ title, value, detail, icon: Icon }) => (
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
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="simulator" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Opportunity simulator"
          description="A lightweight business-case model estimating avoidable denials, administrative savings, and review hours that could be redirected to higher-value work."
        />
        <div className="rounded-3xl border border-lacuna-lavender/40 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(segments) as SegmentKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSegment(key)}
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
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <Metric label="Covered lives" value={selected.lives} />
            <Metric
              label="Monthly avoidable denials"
              value={formatNumber(modeled.avoidableDenials)}
            />
            <Metric
              label="Monthly admin savings"
              value={`$${formatNumber(modeled.monthlySavings)}`}
            />
            <Metric
              label="Auth review hours freed"
              value={formatNumber(modeled.authHours)}
            />
          </div>
        </div>
      </MotionSection>

      <MotionSection id="triage" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Operational triage design"
          description="The project demonstrates how a payer operations team could prioritize work by preventability, risk, automation readiness, and financial impact."
        />
        <div className="overflow-hidden rounded-3xl border border-lacuna-lavender/40 bg-white shadow-sm">
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

      <MotionSection id="roadmap" delay={0.25} className={SECTION}>
        <SectionHeader
          title="90-day implementation roadmap"
          description="A realistic rollout sequence for a payer administration or operations team."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {roadmap.map((item) => (
            <div
              key={item.phase}
              className="rounded-2xl border border-lacuna-lavender/35 bg-white p-5 shadow-sm"
            >
              <div className="text-sm font-semibold text-lacuna-blue">
                {item.phase}
              </div>
              <h3 className="mt-2 text-xl font-bold text-lacuna-plum">
                {item.title}
              </h3>
              <p className="mt-2 leading-relaxed text-lacuna-blue">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </MotionSection>
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
