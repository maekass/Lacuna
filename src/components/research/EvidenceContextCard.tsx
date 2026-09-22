"use client";

import { useId, useState } from "react";

export interface EvidenceContextCardProps {
  source: string;
  title?: string;
  publishedDate?: string;
  dataCutoff?: string;
  scope?: string;
  sourceType?: string;
  lacunaUse?: string;
  prohibitedUses?: readonly string[];
  methodologyNote?: string;
  lastReviewed?: string;
  sourceUrl?: string;
}

function ContextField({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <p>
      <span className="font-medium text-lacuna-plum">{label}:</span> {value}
    </p>
  );
}

/**
 * Compact expandable source-context card.
 * Renders only fields that were supplied. It does not assert verification.
 */
export function EvidenceContextCard({
  source,
  title,
  publishedDate,
  dataCutoff,
  scope,
  sourceType,
  lacunaUse,
  prohibitedUses,
  methodologyNote,
  lastReviewed,
  sourceUrl,
}: EvidenceContextCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const summary = title ? `${source} — ${title}` : source;
  const uses = prohibitedUses?.filter((use) => use.length > 0) ?? [];

  return (
    <div className="rounded-lg border border-lacuna-lavender/40 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-lacuna-lavender/10"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-lacuna-text-secondary">
            Source context
          </span>
          <span className="block truncate text-xs font-medium text-lacuna-plum">
            {summary}
          </span>
        </span>
        <span className="shrink-0 text-[10px] font-medium text-lacuna-blue">
          {open ? "Hide" : "Details"}
        </span>
      </button>
      {open
        ? (
          <div
            id={panelId}
            className="space-y-3 border-t border-lacuna-lavender/30 px-3 py-3 text-xs leading-relaxed text-lacuna-blue"
          >
            <div className="space-y-1">
              <ContextField label="Source" value={source} />
              <ContextField label="Title" value={title} />
              <ContextField label="Published" value={publishedDate} />
              <ContextField label="Data cutoff" value={dataCutoff} />
              <ContextField label="Source type" value={sourceType} />
              <ContextField label="Last reviewed" value={lastReviewed} />
              {sourceUrl
                ? (
                  <p>
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-lacuna-plum underline underline-offset-2 hover:text-lacuna-blue"
                    >
                      External source link
                    </a>
                  </p>
                )
                : null}
            </div>
            {lacunaUse
              ? (
                <p>
                  <span className="font-medium text-lacuna-plum">
                    Used in Lacuna as:{" "}
                  </span>
                  {lacunaUse}
                </p>
              )
              : null}
            {uses.length > 0
              ? (
                <div>
                  <p className="font-medium text-lacuna-plum">Not used for</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {uses.map((use) => <li key={use}>{use}</li>)}
                  </ul>
                </div>
              )
              : null}
            {(scope || methodologyNote)
              ? (
                <div className="space-y-1">
                  <p className="font-medium text-lacuna-plum">
                    Scope and limitations
                  </p>
                  {scope ? <p>{scope}</p> : null}
                  {methodologyNote ? <p>{methodologyNote}</p> : null}
                </div>
              )
              : null}
          </div>
        )
        : null}
    </div>
  );
}
