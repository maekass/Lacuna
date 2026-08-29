"use client";

import Link from "next/link";
import HeuristicTierBadge from "@/components/research/HeuristicTierBadge";
import type { PatientEmpowermentInsightData } from "@/lib/research/patientEmpowermentPipeline";
import { EMPOWERMENT_PREREQUISITE_LABELS } from "@/lib/research/patientEmpowermentTaxonomy";

interface PatientEmpowermentInsightProps {
  /** Slim teaser from getVerifiedDataset() → buildPatientEmpowermentSnapshot on the server. */
  data: PatientEmpowermentInsightData;
  variant?: "card" | "inline";
  className?: string;
}

/** Cross-workspace teaser from empowerment pipeline summary. */
export default function PatientEmpowermentInsight({
  data,
  variant = "card",
  className = "",
}: PatientEmpowermentInsightProps) {
  const weakestPrereq = EMPOWERMENT_PREREQUISITE_LABELS[
    data.highestGapPrerequisiteId
  ];

  if (variant === "inline") {
    return (
      <div
        className={`rounded-md border border-lacuna-lavender/35 bg-lacuna-lavender/10 px-3 py-2 text-xs text-lacuna-blue ${className}`}
      >
        <p className="font-medium text-lacuna-plum">
          HLTH 2022 breast cancer baseline (n=
          {data.surveyRespondents.toLocaleString()})
        </p>
        <p className="mt-1 text-lacuna-blue/80">
          Report: {data.maxGapMetricLabel} (index{" "}
          {data.maxGapIndexPct}). Weighted burden{" "}
          {data.weightedBurdenIndexPct}/100 · {data.criticalMetricCount}{" "}
          critical gaps. Crosswalk: {data.curatedLinkCount} curated ·{" "}
          {data.evidenceBackedLinkCount} evidence-backed.
        </p>
        <Link
          href="/research#patient-empowerment"
          className="mt-1 inline-block font-medium text-lacuna-plum underline underline-offset-2 hover:text-lacuna-blue"
        >
          Gap × portfolio matrix →
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/research#patient-empowerment"
      className={`group block rounded-xl border border-lacuna-lavender/40 bg-lacuna-lavender/15 p-4 transition-shadow hover:shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0">
          <HeuristicTierBadge tier="cited_survey_2022" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-lacuna-blue">
            HLTH/Outcomes4Me 2022 (breast cancer, n=
            {data.surveyRespondents.toLocaleString()}): max gap{" "}
            {data.maxGapIndexPct}/100 ({data.maxGapMetricLabel
              .toLowerCase()}). Weighted burden{" "}
            {data.weightedBurdenIndexPct}/100 · median{" "}
            {data.medianGapIndexPct}/100 · {data.criticalMetricCount}{" "}
            critical. Top priority: {data.topPriorityLabel?.toLowerCase()}{" "}
            ( score {data.topPriorityScore}). Weakest prerequisite:{" "}
            {weakestPrereq.toLowerCase()}.
          </p>
          <p className="mt-2 text-xs text-lacuna-plum/70 group-hover:text-lacuna-blue">
            Cited 2022 survey — not live Lacuna patient data →
          </p>
        </div>
      </div>
    </Link>
  );
}
