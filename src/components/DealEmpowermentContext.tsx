"use client";

import Link from "next/link";
import type { DealEmpowermentContext } from "@/lib/deals/empowermentContextForDeal";
import { EMPOWERMENT_SOURCE_TIER_LABELS } from "@/lib/research/patientEmpowermentTaxonomy";

const SCOPE_LABELS = {
  high: "High baseline alignment",
  limited: "Limited baseline alignment",
  none: "No crosswalk match",
} as const;

/** Deal-level empowerment dimensions (HLTH 2022 baseline affinity). */
export default function DealEmpowermentContext({
  context,
}: {
  context: DealEmpowermentContext;
}) {
  if (!context.hasDirectMatch) {
    return (
      <div className="rounded-lg border border-dashed border-lacuna-lavender/40 bg-lacuna-surface-muted/40 px-4 py-3 text-xs text-lacuna-blue">
        <p className="font-medium text-lacuna-plum">
          Patient empowerment baseline (HLTH 2022)
        </p>
        <p className="mt-1 text-lacuna-blue/80">
          {SCOPE_LABELS[context.scopeAlignment]} — {context.targetName} (
          {context.sector}). {context.baselineNote}
        </p>
        <Link
          href="/research#patient-empowerment"
          className="mt-2 inline-block font-medium text-lacuna-plum underline underline-offset-2"
        >
          View empowerment gap matrix →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-lacuna-lavender/35 bg-lacuna-lavender/10 px-4 py-3 text-xs text-lacuna-blue">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-lacuna-plum">
          Empowerment context — {context.targetName}
        </p>
        <span className="rounded-full border border-lacuna-lavender/40 bg-white px-2 py-0.5 text-[10px] font-medium text-lacuna-plum">
          {SCOPE_LABELS[context.scopeAlignment]}
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
          Affinity {context.affinityScore}% curated
        </span>
        {context.evidenceBackedDimensionCount > 0
          ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900">
              Evidence {context.evidenceScore}% sourced
            </span>
          )
          : null}
      </div>
      <p className="mt-1 text-lacuna-blue/70">{context.baselineNote}</p>
      <ul className="mt-2 space-y-1.5">
        {context.matchedDimensions.slice(0, 4).map((match) => (
          <li
            key={match.dimension.metric.id}
            className="flex justify-between gap-3 rounded border border-lacuna-lavender/25 bg-white/70 px-2 py-1"
          >
            <span>
              {match.dimension.metric.label}{" "}
              <span className="text-lacuna-blue/60">
                ({match.targetMatchTier}
                {match.sourceTier
                  ? ` · ${EMPOWERMENT_SOURCE_TIER_LABELS[match.sourceTier]}`
                  : ""}
                )
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="font-semibold text-lacuna-plum tabular-nums">
                {match.dimension.metric.gapIndexPct}/100
              </span>
              {match.sourceUrl
                ? (
                  <a
                    href={match.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block text-[10px] font-medium text-sky-800 underline underline-offset-2"
                  >
                    Source →
                  </a>
                )
                : null}
            </span>
          </li>
        ))}
      </ul>
      {context.comparableCompanyIds.length > 0
        ? (
          <p className="mt-2 text-lacuna-blue/70">
            Curated comparables in sample: {context.comparableCompanyIds.length}
            {" "}
            companies share empowerment tags
          </p>
        )
        : null}
      <Link
        href="/research#patient-empowerment"
        className="mt-2 inline-block font-medium text-lacuna-plum underline underline-offset-2"
      >
        Full gap matrix →
      </Link>
    </div>
  );
}
