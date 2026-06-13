"use client";

import { lazy, Suspense, type ComponentType } from "react";

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

function lazyWithFallback<T extends ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
  FallbackComponent: ComponentType,
) {
  const LazyComponent = lazy(factory);
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<FallbackComponent />}>
        {/* @ts-ignore */}
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export const ForceNetwork = lazyWithFallback(
  () => import("@/components/ForceNetwork"),
  sectionFallback("h-[480px] animate-pulse rounded-xl bg-lacuna-pink/10", "Loading network graph"),
);
export const DealFlowChart = lazyWithFallback(
  () => import("@/components/DealFlowChart"),
  sectionFallback(),
);
export const ValuationMatrix = lazyWithFallback(
  () => import("@/components/ValuationMatrix"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const QuantValuationPanel = lazyWithFallback(
  () => import("@/components/QuantValuationPanel"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const ClinicalTrialTracker = lazyWithFallback(
  () => import("@/components/ClinicalTrialTracker"),
  sectionFallback("h-80 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const DomesticStudyCatalog = lazyWithFallback(
  () => import("@/components/DomesticStudyCatalog"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const EvidenceMaturityDashboard = lazyWithFallback(
  () => import("@/components/EvidenceMaturityDashboard"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const HealthEquityDashboard = lazyWithFallback(
  () => import("@/components/HealthEquityDashboard"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const ImpactOpportunityCard = lazyWithFallback(
  () => import("@/components/ImpactOpportunityCard"),
  sectionFallback(),
);
export const ValidationTracker = lazyWithFallback(
  () => import("@/components/ValidationTracker"),
  sectionFallback(),
);
export const NetworkAnalysisHonest = lazyWithFallback(
  () => import("@/components/NetworkAnalysisHonest"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const CompetitiveAnalysisDashboard = lazyWithFallback(
  () => import("@/components/CompetitiveAnalysisDashboard"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const CausalDAG = lazyWithFallback(
  () => import("@/components/CausalDAG"),
  sectionFallback(),
);
export const CausalInferenceEngine = lazyWithFallback(
  () => import("@/components/CausalInferenceEngine"),
  sectionFallback("h-80 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const TemporalValidation = lazyWithFallback(
  () => import("@/components/TemporalValidation"),
  sectionFallback(),
);
export const SensitivityAnalysis = lazyWithFallback(
  () => import("@/components/SensitivityAnalysis"),
  sectionFallback(),
);
export const BayesianCausalAnalysis = lazyWithFallback(
  () => import("@/components/BayesianCausalAnalysis"),
  sectionFallback(),
);
export const ExitPredictor = lazyWithFallback(
  () => import("@/components/ExitPredictor"),
  sectionFallback(),
);
export const CompanySimilarity = lazyWithFallback(
  () => import("@/components/CompanySimilarity"),
  sectionFallback(),
);
export const ClusteringAnalysis = lazyWithFallback(
  () => import("@/components/ClusteringAnalysis"),
  sectionFallback(),
);
export const WhiteSpaceAnalysis = lazyWithFallback(
  () => import("@/components/WhiteSpaceAnalysis"),
  sectionFallback(),
);
export const ReimbursementIntelligenceDashboard = lazyWithFallback(
  () => import("@/components/ReimbursementIntelligenceDashboard"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const InvestmentGradeReimbursementIntel = lazyWithFallback(
  () => import("@/components/InvestmentGradeReimbursementIntel"),
  sectionFallback("h-[600px] animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const BusinessModelClassifier = lazyWithFallback(
  () => import("@/components/business-model-classifier"),
  sectionFallback(),
);
export const VariantCallsetBrowser = lazyWithFallback(
  () => import("@/components/VariantCallsetBrowser"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const AcquirerPredictionDashboard = lazyWithFallback(
  () => import("@/components/AcquirerPredictionDashboard"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const CommercializationReadiness = lazyWithFallback(
  () => import("@/components/CommercializationReadiness"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const SystemHealthDashboard = lazyWithFallback(
  () => import("@/components/SystemHealthDashboard"),
  sectionFallback("h-80 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const DataPipelineStatus = lazyWithFallback(
  () => import("@/components/DataPipelineStatus"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const DeveloperTools = lazyWithFallback(
  () => import("@/components/DeveloperTools"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
export const DataExport = lazyWithFallback(
  () => import("@/components/DataExport"),
  sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
);
