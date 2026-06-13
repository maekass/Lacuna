"use client";

import { Link } from "wouter";
import DataProvenanceBanner from "@/components/DataProvenanceBanner";
import MotionSection from "@/components/ui/MotionSection";
import StatTile from "@/components/ui/StatTile";
import { useDashboardData } from "@/lib/data/useDashboardData";
import { WORKSPACES } from "@/lib/navigation/workspaces";

/** Render huge relative gaps as a multiplier ("76× higher") — "7503% above" is unreadable. */
function formatValuationGap(percentDiff: number): string {
  if (percentDiff >= 400) {
    const multiple = 1 + percentDiff / 100;
    return `${
      multiple >= 10 ? multiple.toFixed(0) : multiple.toFixed(1)
    }× higher than`;
  }
  return `${percentDiff.toFixed(0)}% above`;
}

const WORKSPACE_ACCENTS = [
  { color: "from-[#4a5d8a]/10 to-[#4a5d8a]/5", border: "border-t-[#4a5d8a]", dot: "bg-[#4a5d8a]" },
  { color: "from-[#3a7d7a]/10 to-[#3a7d7a]/5", border: "border-t-[#3a7d7a]", dot: "bg-[#3a7d7a]" },
  { color: "from-[#b8a9c9]/20 to-[#b8a9c9]/5", border: "border-t-[#b8a9c9]", dot: "bg-[#b8a9c9]" },
  { color: "from-[#5d4e6d]/10 to-[#5d4e6d]/5", border: "border-t-[#5d4e6d]", dot: "bg-[#5d4e6d]" },
];

const STAT_ACCENTS = ["blue", "lavender", "pink", "plum"] as const;

export default function HubPage() {
  const { verifiedAcquisitions, valuationDisparity, headlineStats } =
    useDashboardData();

  return (
    <div id="top">
      <MotionSection className="mb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lacuna-lavender/40 bg-white/80 px-3 py-1 text-xs font-medium text-lacuna-blue/80 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v6 · {verifiedAcquisitions.length} verified deals · Open source
            </div>
            <h1 className="mb-4 text-3xl font-bold leading-tight text-lacuna-plum sm:text-4xl md:text-5xl">
              <span className="block">Women&apos;s Health M&amp;A</span>
              <span className="lacuna-gradient-text block">Diligence Stack</span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-lacuna-blue/90">
              Prototype investment-research environment — verified deal
              provenance, clinical trial search, genomics governance, and cited
              analytics from public sources.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-lacuna-blue/60">
              SEC EDGAR ingest · HIPAA/GDPR genomics layer · descriptive analytics only.
              Not PitchBook, not live market feeds, and not investment advice.
            </p>
          </div>

          <div className="shrink-0 hidden lg:flex flex-col gap-2 items-end">
            {["SEC EDGAR", "ClinicalTrials.gov", "NIH · Harvard · MIT", "HIPAA/GDPR Ready"].map((tag) => (
              <div key={tag} className="flex items-center gap-2 rounded-full border border-lacuna-lavender/30 bg-white/60 px-3 py-1.5 text-xs font-medium text-lacuna-blue/70">
                <span className="h-1 w-1 rounded-full bg-lacuna-lavender" />
                {tag}
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.05} className="mb-8">
        <DataProvenanceBanner />
      </MotionSection>

      <MotionSection
        delay={0.1}
        className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {headlineStats.map((stat, i) => (
          <StatTile
            key={stat.label}
            value={stat.value}
            label={stat.label}
            accent={STAT_ACCENTS[i % STAT_ACCENTS.length]}
          />
        ))}
      </MotionSection>

      {valuationDisparity !== null
        ? (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-lacuna-lavender/35 bg-gradient-to-r from-lacuna-lavender/15 to-lacuna-pink/10 p-4 shadow-sm">
            <span className="mt-0.5 shrink-0 rounded-full bg-lacuna-plum/10 px-2 py-0.5 text-xs font-semibold text-lacuna-plum">
              Insight
            </span>
            <span className="text-sm leading-relaxed text-lacuna-blue/90">
              Among disclosed valuations, {valuationDisparity.highSector}{" "}
              averages {formatValuationGap(valuationDisparity.percentDiff)}{" "}
              {valuationDisparity.lowSector}{" "}
              — the widest sector gap in the dataset (n={valuationDisparity
                .highN} vs n={valuationDisparity.lowN} disclosed).
            </span>
          </div>
        )
        : null}

      <MotionSection delay={0.15}>
        <div className="mb-5 flex items-baseline gap-3">
          <h2 className="text-2xl font-semibold text-lacuna-plum">
            Choose a workspace
          </h2>
          <span className="text-sm text-lacuna-blue/60">{WORKSPACES.length} workspaces</span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-lacuna-blue/75 leading-relaxed">
          Dashboards are grouped by diligence workflow. Each workspace loads
          only the panels you need — shareable URLs, less scroll fatigue.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:gap-4 sm:grid-cols-2">
          {WORKSPACES.map((ws, i) => {
            const accent = WORKSPACE_ACCENTS[i % WORKSPACE_ACCENTS.length];
            return (
              <Link
                key={ws.slug}
                href={ws.href}
                className={`group rounded-xl border border-lacuna-lavender/30 bg-gradient-to-br ${accent.color} border-t-2 ${accent.border} p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-lavender bg-white`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-lacuna-plum group-hover:text-lacuna-blue transition-colors">
                    {ws.label}
                  </h3>
                  <span className="text-lacuna-plum/30 group-hover:text-lacuna-blue/60 transition-colors text-lg leading-none">→</span>
                </div>
                <p className="text-sm leading-relaxed text-lacuna-blue/75">
                  {ws.description}
                </p>
                <div className="mt-4 flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                  <p className="text-xs font-medium text-lacuna-plum/60">
                    {ws.sections.length} sections
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </MotionSection>
    </div>
  );
}
