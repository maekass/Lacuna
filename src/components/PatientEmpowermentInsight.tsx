"use client";

import Link from "next/link";
import { useMemo } from "react";
import verifiedDataset from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { buildPatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";
import { EMPOWERMENT_PREREQUISITE_LABELS } from "@/lib/research/patientEmpowermentTaxonomy";

interface PatientEmpowermentInsightProps {
  variant?: "card" | "inline";
  className?: string;
}

/** Cross-workspace teaser from empowerment pipeline summary. */
export default function PatientEmpowermentInsight({
  variant = "card",
  className = "",
}: PatientEmpowermentInsightProps) {
  const snapshot = useMemo(
    () => buildPatientEmpowermentSnapshot(verifiedDataset as VerifiedDataset),
    [],
  );
  const { summary, headline } = snapshot;
  const topGap = [...snapshot.dimensions].sort(
    (a, b) => b.metric.gapIndexPct - a.metric.gapIndexPct,
  )[0];
  const weakestPrereq = EMPOWERMENT_PREREQUISITE_LABELS[
    summary.highestGapPrerequisiteId
  ];

  if (variant === "inline") {
    return (
      <div
        className={`rounded-md border border-lacuna-lavender/35 bg-lacuna-lavender/10 px-3 py-2 text-xs text-lacuna-blue ${className}`}
      >
        <p className="font-medium text-lacuna-plum">
          HLTH 2022 breast cancer baseline (n=
          {headline.surveyRespondents.toLocaleString()})
        </p>
        <p className="mt-1 text-lacuna-blue/80">
          Report: {topGap?.metric.citedValue}{" "}
          {topGap?.metric.label.toLowerCase()} (gap index{" "}
          {topGap?.metric.gapIndexPct}/100). Lacuna crosswalk:{" "}
          {summary.linkedCompanyCount} companies, {summary.curatedLinkCount}{" "}
          curated links.
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
        <span className="shrink-0 text-sm font-medium text-lacuna-plum">
          Context
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-lacuna-blue">
            HLTH/Outcomes4Me 2022 (breast cancer, n=
            {headline.surveyRespondents.toLocaleString()}):{" "}
            {topGap?.metric.citedValue} {topGap?.metric.label.toLowerCase()}{" "}
            (index {topGap?.metric.gapIndexPct}/100). Weakest prerequisite:{" "}
            {weakestPrereq.toLowerCase()}. Crosswalked to{" "}
            {summary.linkedCompanyCount} sample companies (
            {summary.curatedLinkCount} curated).
          </p>
          <p className="mt-2 text-xs text-lacuna-plum/70 group-hover:text-lacuna-blue">
            Cited survey baseline — not Lacuna patient data →
          </p>
        </div>
      </div>
    </Link>
  );
}
