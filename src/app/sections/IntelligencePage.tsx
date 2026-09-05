"use client";

import {
  AcquirerPredictionDashboard,
  DataExport,
  DeveloperTools,
  InvestmentGradeReimbursementIntel,
  SystemHealthDashboard,
} from "@/app/lazyDashboard";
import ExportToGamma from "@/components/ExportToGamma";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import type { ReactNode } from "react";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

interface IntelligencePageProps {
  /** Server-rendered pipeline panel driven by committed artifacts. */
  pipelinePanel: ReactNode;
  /** Server-rendered catalyst CSV table — no client dataset import. */
  catalystWatchlist?: ReactNode;
}

export default function IntelligencePage(
  { pipelinePanel, catalystWatchlist }: IntelligencePageProps,
) {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Intelligence workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Reimbursement context, acquirer affinity scores, and export tools. Fit
          scores stay labeled affinity — they do not feed deal economics,
          valuation peers, or dual-source badges.
        </p>
      </header>

      <MotionSection id="system-health" className={SECTION}>
        <SectionHeader
          title="System Health & Monitoring"
          description="Real-time API health checks, latency tracking, and service availability monitoring for production deployments."
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SystemHealthDashboard />
          {pipelinePanel}
        </div>
      </MotionSection>

      <MotionSection
        id="reimbursement-intelligence"
        delay={0.05}
        className={SECTION}
      >
        <SectionHeader
          title="Reimbursement & Commercial Due Diligence"
          description="Verified deal context by sector from the curated dataset — no invented TAM, payer mix, or keyword risk scores."
        />
        <InvestmentGradeReimbursementIntel />
      </MotionSection>

      {catalystWatchlist
        ? (
          <MotionSection id="catalyst-watchlist" className={SECTION}>
            <SectionHeader
              title="Catalyst watchlist"
              description="Weekly biopharma calendar joined to Lacuna's verified acquirer and company ids. Dates are scheduled PDUFA/readout marks with an actual date when the decision already happened."
            />
            {catalystWatchlist}
          </MotionSection>
        )
        : null}

      <MotionSection id="acquirer-prediction" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Strategic acquirer fit (descriptive)"
          description="Rule-based affinity scores from verified deal history and stated acquirer profiles — not a trained prediction model, deal premium, or valuation peer set. Optional LLM blurbs are exploratory copy, not validated research."
        />
        <AcquirerPredictionDashboard />
      </MotionSection>

      <MotionSection id="export" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Export & share"
          description="Generate presentations and download dataset exports in multiple formats for analysis and integration."
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ExportToGamma />
          <DataExport />
        </div>
      </MotionSection>

      <MotionSection id="developer-tools" delay={0.15} className={SECTION}>
        <SectionHeader
          title="Developer Tools"
          description="API documentation, SDK references, code examples, and integration guides for engineers building on the Lacuna platform."
        />
        <DeveloperTools />
      </MotionSection>
    </div>
  );
}
