"use client";

import dynamic from "next/dynamic";

function sectionFallback(
  className = "h-64 animate-pulse rounded-xl bg-lacuna-pink/10",
  label = "Loading dashboard section",
) {
  return function SectionFallback() {
    return (
      <div className={className} aria-busy="true" aria-live="polite">
        <span className="sr-only">{label}</span>
      </div>
    );
  };
}

export const ForceNetwork = dynamic(() => import("@/components/ForceNetwork"), {
  loading: sectionFallback(
    "h-[480px] animate-pulse rounded-xl bg-lacuna-pink/10",
    "Loading network graph",
  ),
});
export const DealFlowChart = dynamic(
  () => import("@/components/DealFlowChart"),
  {
    loading: sectionFallback(),
  },
);
export const ValuationMatrix = dynamic(
  () => import("@/components/ValuationMatrix"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const QuantValuationPanel = dynamic(
  () => import("@/components/QuantValuationPanel"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const ClinicalTrialTracker = dynamic(
  () => import("@/components/ClinicalTrialTracker"),
  {
    loading: sectionFallback("h-80 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const DomesticStudyCatalog = dynamic(
  () => import("@/components/DomesticStudyCatalog"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const EvidenceMaturityDashboard = dynamic(
  () => import("@/components/EvidenceMaturityDashboard"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const HealthEquityDashboard = dynamic(
  () => import("@/components/HealthEquityDashboard"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const ImpactOpportunityCard = dynamic(
  () => import("@/components/ImpactOpportunityCard"),
  {
    loading: sectionFallback(),
  },
);
export const ValidationTracker = dynamic(
  () => import("@/components/ValidationTracker"),
  {
    loading: sectionFallback(),
  },
);
export const NetworkAnalysisHonest = dynamic(
  () => import("@/components/NetworkAnalysisHonest"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const CompetitiveAnalysisDashboard = dynamic(
  () => import("@/components/CompetitiveAnalysisDashboard"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const CausalDAG = dynamic(() => import("@/components/CausalDAG"), {
  loading: sectionFallback(),
});
export const CausalInferenceEngine = dynamic(
  () => import("@/components/CausalInferenceEngine"),
  {
    loading: sectionFallback("h-80 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const TemporalValidation = dynamic(
  () => import("@/components/TemporalValidation"),
  {
    loading: sectionFallback(),
  },
);
export const SensitivityAnalysis = dynamic(
  () => import("@/components/SensitivityAnalysis"),
  {
    loading: sectionFallback(),
  },
);
export const BayesianCausalAnalysis = dynamic(
  () => import("@/components/BayesianCausalAnalysis"),
  {
    loading: sectionFallback(),
  },
);
export const ExitPredictor = dynamic(
  () => import("@/components/ExitPredictor"),
  {
    loading: sectionFallback(),
  },
);
export const CompanySimilarity = dynamic(
  () => import("@/components/CompanySimilarity"),
  {
    loading: sectionFallback(),
  },
);
export const ClusteringAnalysis = dynamic(
  () => import("@/components/ClusteringAnalysis"),
  {
    loading: sectionFallback(),
  },
);
export const WhiteSpaceAnalysis = dynamic(
  () => import("@/components/WhiteSpaceAnalysis"),
  {
    loading: sectionFallback(),
  },
);
export const ReimbursementIntelligenceDashboard = dynamic(
  () => import("@/components/ReimbursementIntelligenceDashboard"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const BusinessModelClassifier = dynamic(
  () => import("@/components/business-model-classifier"),
  { loading: sectionFallback() },
);
export const VariantCallsetBrowser = dynamic(
  () => import("@/components/VariantCallsetBrowser"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const AcquirerPredictionDashboard = dynamic(
  () => import("@/components/AcquirerPredictionDashboard"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
