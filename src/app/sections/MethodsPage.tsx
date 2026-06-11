"use client";

import {
  BayesianCausalAnalysis,
  CausalDAG,
  CausalInferenceEngine,
  SensitivityAnalysis,
  TemporalValidation,
} from "@/app/lazyDashboard";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import { useDashboardData } from "@/lib/data/useDashboardData";

const SECTION = "mb-16 scroll-mt-28";

export default function MethodsPage() {
  const { verifiedAcquisitions } = useDashboardData();

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">Methods workspace</h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Causal framing, temporal patterns, sensitivity checks, and Bayesian
          small-n analysis — descriptive only, not forecasts.
        </p>
        <p
          className="mt-3 rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/15 px-3 py-2 text-xs text-lacuna-blue"
          role="note"
        >
          Scores and models here are exploratory heuristics on n=
          {verifiedAcquisitions.length} verified deals. They are not validated
          for investment decisions.
        </p>
      </header>

      <MotionSection id="causal-dag" className={SECTION}>
        <SectionHeader
          title="Understanding Cause & Effect"
          description="Our approach to teasing apart what actually drives acquisition outcomes — with full transparency about what we can and can't claim."
        />
        <CausalDAG />
      </MotionSection>

      <MotionSection id="causal-engine" delay={0.05} className={SECTION}>
        <SectionHeader
          title="What the Data Actually Says"
          description="Sector-level patterns drawn directly from verified deals — no simulations, just what the numbers tell us."
        />
        <CausalInferenceEngine />
      </MotionSection>

      <MotionSection id="temporal" delay={0.1} className={SECTION}>
        <SectionHeader
          title="The Story Over Time"
          description="When are deals happening, and how has the pace of women's health M&A evolved?"
        />
        <TemporalValidation />
      </MotionSection>

      <MotionSection id="sensitivity" delay={0.15} className={SECTION}>
        <SectionHeader
          title="How Robust Are Our Findings?"
          description="We stress-test our models so you know how much to trust them — because honest research means showing the seams."
        />
        <SensitivityAnalysis />
      </MotionSection>

      <MotionSection id="bayesian-causal" delay={0.2} className={SECTION}>
        <SectionHeader
          title="Small Dataset, Big Questions"
          description={`With ${verifiedAcquisitions.length} verified deals, we use Bayesian methods designed for small samples — because every data point matters.`}
        />
        <BayesianCausalAnalysis />
      </MotionSection>
    </div>
  );
}
