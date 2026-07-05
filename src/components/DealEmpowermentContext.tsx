"use client";

import Link from "next/link";
import type { DealEmpowermentContext } from "@/lib/deals/empowermentContextForDeal";

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
          No direct crosswalk for {context.targetName} ({context.sector}).
          {" "}{context.baselineNote}
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
      <p className="font-medium text-lacuna-plum">
        Patient empowerment context — {context.targetName}
      </p>
      <p className="mt-1 text-lacuna-blue/70">{context.baselineNote}</p>
      <ul className="mt-2 space-y-1.5">
        {context.matchedDimensions.slice(0, 4).map((dim) => (
          <li
            key={dim.metric.id}
            className="flex justify-between gap-3 rounded border border-lacuna-lavender/25 bg-white/70 px-2 py-1"
          >
            <span>{dim.metric.label}</span>
            <span className="shrink-0 font-semibold text-lacuna-plum tabular-nums">
              {dim.metric.gapIndexPct}/100
            </span>
          </li>
        ))}
      </ul>
      {context.matchedDimensions.length > 4
        ? (
          <p className="mt-1 text-lacuna-blue/60">
            +{context.matchedDimensions.length - 4} more dimensions
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
