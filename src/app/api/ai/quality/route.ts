import { NextResponse } from "next/server";
import { isServerInferenceConfigured } from "@/lib/ai/inference";
import { PROMPT_VERSION } from "@/lib/ai/prompts";
import { LLM_QUALITY_CATALOG } from "@/lib/ai/quality";

/** GET — platform LLM quality catalog and configuration status. */
export function GET() {
  return NextResponse.json({
    configured: isServerInferenceConfigured(),
    promptVersion: PROMPT_VERSION,
    standards: [
      "Centralized prompts with anti-hallucination guardrails",
      "Post-hoc sanitize + advice/hallucination pattern checks",
      "Grounding against provided context (money, NCT IDs)",
      "Quality score and level on every free-text response",
      "Blocked outputs replaced with safe fallback copy",
      "Gateway tags: feature:* and quality:gated",
    ],
    features: LLM_QUALITY_CATALOG,
    note:
      "Streaming insights (/api/ai/stream) are best-effort; prefer non-streaming routes for full quality gating.",
  });
}
