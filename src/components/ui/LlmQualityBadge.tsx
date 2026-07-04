"use client";

import type { LlmQualityReport } from "@/lib/ai/quality";

const LEVEL_STYLES: Record<
  LlmQualityReport["level"],
  string
> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-900 border-amber-200",
  low: "bg-orange-50 text-orange-900 border-orange-200",
  blocked: "bg-red-50 text-red-800 border-red-200",
};

interface LlmQualityBadgeProps {
  quality: LlmQualityReport | null | undefined;
  modelId?: string | null;
  className?: string;
}

/** Compact quality metadata for LLM narratives across the platform. */
export default function LlmQualityBadge({
  quality,
  modelId,
  className = "",
}: LlmQualityBadgeProps) {
  if (!quality) {
    return modelId
      ? (
        <p className={`text-[10px] text-lacuna-blue/60 ${className}`}>
          Model: {modelId}
        </p>
      )
      : null;
  }

  return (
    <div className={`mt-2 space-y-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            LEVEL_STYLES[quality.level]
          }`}
        >
          Quality {quality.level} ({quality.score})
        </span>
        <span className="text-[10px] text-lacuna-blue/60">
          {quality.modelId}
          {" · "}
          prompts v{quality.promptVersion}
        </span>
      </div>
      {quality.warnings.length > 0 && (
        <p className="text-[10px] leading-snug text-lacuna-blue/70">
          {quality.warnings.slice(0, 2).join(" · ")}
        </p>
      )}
    </div>
  );
}
