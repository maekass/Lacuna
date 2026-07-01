"use client";

import dynamic from "next/dynamic";

function ForceNetworkSkeleton() {
  const nodes = [
    { cx: 88, cy: 200, r: 7 },
    { cx: 168, cy: 128, r: 9 },
    { cx: 248, cy: 88, r: 8 },
    { cx: 312, cy: 152, r: 7 },
    { cx: 356, cy: 232, r: 9 },
    { cx: 280, cy: 248, r: 8 },
    { cx: 192, cy: 224, r: 7 },
    { cx: 128, cy: 272, r: 8 },
  ] as const;

  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [1, 6],
    [2, 5],
    [0, 7],
  ];

  return (
    <div
      className="relative h-[480px] animate-pulse overflow-hidden rounded-xl bg-lacuna-pink/10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading network graph</span>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 320"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {edges.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={nodes[from].cx}
            y1={nodes[from].cy}
            x2={nodes[to].cx}
            y2={nodes[to].cy}
            className="stroke-lacuna-pink/30"
            strokeWidth="2"
          />
        ))}
        {nodes.map((node, index) => (
          <circle
            key={index}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            className="fill-lacuna-pink/35"
          />
        ))}
      </svg>
    </div>
  );
}

function DealFlowChartSkeleton() {
  const bars = ["h-14", "h-28", "h-20", "h-32", "h-16", "h-24"] as const;

  return (
    <div
      className="flex h-64 animate-pulse items-end justify-center gap-3 rounded-xl bg-lacuna-pink/10 px-8 pb-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading dashboard section</span>
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-8 rounded-t-md bg-lacuna-pink/25 ${height}`}
        />
      ))}
    </div>
  );
}

function ValuationMatrixSkeleton() {
  return (
    <div
      className="flex h-96 animate-pulse items-center justify-center rounded-xl bg-lacuna-pink/10 p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading dashboard section</span>
      <div className="grid w-full max-w-md grid-cols-5 gap-2">
        {Array.from({ length: 20 }, (_, index) => (
          <div
            key={index}
            className="aspect-square rounded-md bg-lacuna-pink/25"
          />
        ))}
      </div>
    </div>
  );
}

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
  loading: ForceNetworkSkeleton,
});
export const DealFlowChart = dynamic(
  () => import("@/components/DealFlowChart"),
  {
    loading: DealFlowChartSkeleton,
  },
);
export const ValuationMatrix = dynamic(
  () => import("@/components/ValuationMatrix"),
  {
    loading: ValuationMatrixSkeleton,
  },
);
export const SurvivalCurve = dynamic(
  () => import("@/components/SurvivalCurve"),
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
export const InvestmentGradeReimbursementIntel = dynamic(
  () => import("@/components/InvestmentGradeReimbursementIntel"),
  {
    loading: sectionFallback(
      "h-[600px] animate-pulse rounded-xl bg-lacuna-pink/10",
    ),
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
export const CommercializationReadiness = dynamic(
  () => import("@/components/CommercializationReadiness"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const SystemHealthDashboard = dynamic(
  () => import("@/components/SystemHealthDashboard"),
  {
    loading: sectionFallback("h-80 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const DataPipelineStatus = dynamic(
  () => import("@/components/DataPipelineStatus"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const DeveloperTools = dynamic(
  () => import("@/components/DeveloperTools"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const DataExport = dynamic(
  () => import("@/components/DataExport"),
  {
    loading: sectionFallback("h-96 animate-pulse rounded-xl bg-lacuna-pink/10"),
  },
);
export const BurdenCapitalGap = dynamic(
  () => import("@/components/BurdenCapitalGap"),
  {
    loading: sectionFallback(
      "h-[520px] animate-pulse rounded-xl bg-lacuna-pink/10",
    ),
  },
);
export const BurdenCapitalGapValuation = dynamic(
  () => import("@/components/BurdenCapitalGapValuation"),
  {
    loading: sectionFallback(
      "h-[600px] animate-pulse rounded-xl bg-lacuna-pink/10",
    ),
  },
);
