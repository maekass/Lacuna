"use client";

import React from "react";
import { formatSourceLine } from "@/lib/format/sources";

interface DiscreteSourcesProps {
  /** Human-readable citation strings (Crunchbase, press, etc.) */
  sources?: readonly string[];
  valuationSource?: string;
  /** Optional short label before the line (default: none — line reads as quiet footnote) */
  prefix?: string;
  className?: string;
  max?: number;
}

/**
 * Low-contrast footnote for provenance — keeps citations visible without dominating the layout.
 */
export default function DiscreteSources({
  sources = [],
  valuationSource,
  prefix,
  className = "",
  max = 2,
}: DiscreteSourcesProps) {
  const line = formatSourceLine(sources, { max, valuationSource });
  if (!line) return null;

  return (
    <p
      className={`text-[10px] leading-snug text-lacuna-text-muted ${className}`}
      title={sources.length > max ? sources.join(" · ") : undefined}
    >
      {prefix ? <span className="text-lacuna-text-muted">{prefix}</span> : null}
      {line}
    </p>
  );
}

interface DiscreteSourceNoteProps {
  children: React.ReactNode;
  className?: string;
}

/** Single-line methodological or dataset note (italic, same scale as footnotes). */
export function DiscreteSourceNote(
  { children, className = "" }: DiscreteSourceNoteProps,
) {
  return (
    <p
      className={`text-[10px] italic leading-snug text-lacuna-text-muted ${className}`}
    >
      {children}
    </p>
  );
}
