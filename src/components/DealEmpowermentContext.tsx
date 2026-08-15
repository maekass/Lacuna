"use client";

import Link from "next/link";
import type { DealEmpowermentContext } from "@/lib/deals/empowermentContextForDeal";
import { EMPOWERMENT_SOURCE_TIER_LABELS } from "@/lib/research/patientEmpowermentTaxonomy";

const SCOPE_LABELS = {
  high: "Curated survey mapping",
  limited: "Curated mapping · off-baseline sector",
  none: "No curated mapping",
} as const;

/** Deal-level HLTH 2022 rows — curated mappings and cited survey copy only. */
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
          Research workspace (includes heuristic crosswalk) →
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
      </div>
      <p className="mt-1 text-lacuna-blue/70">{context.baselineNote}</p>
      <ul className="mt-2 space-y-1.5">
        {context.matchedDimensions.slice(0, 4).map((match) => (
          <li
            key={match.dimension.metric.id}
            className="flex justify-between gap-3 rounded border border-lacuna-lavender/25 bg-white/70 px-2 py-1"
          >
            <span>
              {match.dimension.metric.label}
              {match.sourceTier
                ? (
                  <span className="text-lacuna-blue/60">
                    {" "}({EMPOWERMENT_SOURCE_TIER_LABELS[match.sourceTier]})
                  </span>
                )
                : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="font-semibold text-lacuna-plum">
                {match.citedValue}
              </span>
              <span className="block text-[10px] text-lacuna-blue/70">
                cited HLTH 2022
              </span>
              {match.sourceUrl
                ? (
                  <a
                    href={match.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block text-[10px] font-medium text-sky-800 underline underline-offset-2"
                  >
                    Mapping source →
                  </a>
                )
                : null}
            </span>
          </li>
        ))}
      </ul>
      {context.comparableNames.length > 0
        ? (
          <p className="mt-2 text-lacuna-blue/70">
            Other curated mappings on these gaps:{" "}
            {context.comparableNames.slice(0, 4).join(", ")}
          </p>
        )
        : null}
      <Link
        href="/research#patient-empowerment"
        className="mt-2 inline-block font-medium text-lacuna-plum underline underline-offset-2"
      >
        Full cited gap matrix →
      </Link>
    </div>
  );
}
