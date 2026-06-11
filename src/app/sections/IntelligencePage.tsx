"use client";

import {
  AcquirerPredictionDashboard,
  BusinessModelClassifier,
  ReimbursementIntelligenceDashboard,
} from "@/app/lazyDashboard";
import ExportToGamma from "@/components/ExportToGamma";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";

const SECTION = "mb-16 scroll-mt-28";

export default function IntelligencePage() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Intelligence workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Reimbursement context, strategic acquirer fit (descriptive), and deck
          export — exploratory framing, not advice or live claims data.
        </p>
      </header>

      <MotionSection id="reimbursement-intelligence" className={SECTION}>
        <SectionHeader
          title="Reimbursement context (descriptive)"
          description="Illustrative CMS code mapping and business-model labels on verified companies — exploratory framing, not reimbursement advice or live claims data."
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ReimbursementIntelligenceDashboard />
          </div>
          <div>
            <BusinessModelClassifier />
          </div>
        </div>
      </MotionSection>

      <MotionSection id="acquirer-prediction" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Strategic acquirer fit (descriptive)"
          description="Rule-based match scores from verified deal history and stated acquirer profiles — not a trained prediction model. Optional LLM blurbs are exploratory copy, not validated research."
        />
        <AcquirerPredictionDashboard />
      </MotionSection>

      <MotionSection id="export" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Export & share"
          description="Generate a Gamma deck from verified dataset slices — for portfolio walkthroughs and methodology demos."
        />
        <ExportToGamma />
      </MotionSection>
    </div>
  );
}
