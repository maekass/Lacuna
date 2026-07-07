"use client";

import type { PromotionPreviewDiff } from "@/lib/ingestion/promotionPreview";

interface PromotionPreviewDiffProps {
  diff: PromotionPreviewDiff | null;
  missingFields: string[];
  validationErrors: string[];
  ready: boolean;
  fieldLabels: Record<string, string>;
}

function DiffSection({
  title,
  section,
}: {
  title: string;
  section: PromotionPreviewDiff["acquisitions"] | null;
}) {
  if (!section) return null;
  const badge = section.action === "add"
    ? "bg-emerald-100 text-emerald-900"
    : section.action === "existing"
    ? "bg-sky-100 text-sky-900"
    : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-lg border border-lacuna-lavender/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-plum">
          {title}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}
        >
          {section.action}
        </span>
        <span className="text-xs text-lacuna-blue">{section.label}</span>
        <span className="text-[10px] text-lacuna-blue/60">({section.id})</span>
      </div>
      {section.row
        ? (
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-lacuna-lavender/10 p-2 text-[11px] leading-relaxed text-lacuna-blue">
            {JSON.stringify(section.row, null, 2)}
          </pre>
        )
        : null}
    </div>
  );
}

export default function PromotionPreviewDiffPanel({
  diff,
  missingFields,
  validationErrors,
  ready,
  fieldLabels,
}: PromotionPreviewDiffProps) {
  return (
    <div className="space-y-3 rounded-lg border border-lacuna-lavender/50 bg-lacuna-lavender/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-lacuna-plum">
          Verified JSON preview
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            ready
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {ready ? "Ready to merge" : "Incomplete"}
        </span>
      </div>

      {missingFields.length > 0
        ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-amber-900">
            {missingFields.map((field) => (
              <li key={field}>{fieldLabels[field] ?? field}</li>
            ))}
          </ul>
        )
        : null}

      {validationErrors.length > 0
        ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-red-800">
            {validationErrors.map((err) => <li key={err}>{err}</li>)}
          </ul>
        )
        : null}

      {diff
        ? (
          <div className="space-y-2">
            <DiffSection title="Company" section={diff.companies} />
            <DiffSection title="Acquirer" section={diff.acquirers} />
            <DiffSection title="Acquisition" section={diff.acquisitions} />
          </div>
        )
        : (
          <p className="text-xs text-lacuna-blue/80">
            Complete promotion fields to preview the verified JSON diff.
          </p>
        )}
    </div>
  );
}
