"use client";

import type { ReactNode } from "react";
import { LacunaTooltip } from "@/components/ui/Tooltip";
import {
  formatModelProvenanceLine,
  type ModelProvenance,
  modelSourceHref,
} from "@/lib/provenance/modelProvenance";

interface ModelProvenanceHintProps {
  model: ModelProvenance;
  children: ReactNode;
  className?: string;
}

/** Hover affordance linking a metric to its backing `.ts` model and definition. */
export function ModelProvenanceHint({
  model,
  children,
  className,
}: ModelProvenanceHintProps) {
  return (
    <LacunaTooltip
      className={className}
      content={
        <div className="space-y-1.5">
          <p className="font-medium leading-snug">
            {formatModelProvenanceLine(model)}
          </p>
          <p className="leading-snug text-lacuna-text-inverse/90">
            {model.definition}
          </p>
          <a
            href={modelSourceHref(model.module)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block underline underline-offset-2 hover:text-white"
          >
            View source →
          </a>
        </div>
      }
    >
      {children}
    </LacunaTooltip>
  );
}
