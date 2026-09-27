import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  claimErrorStatus,
  storeAiDraft,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";

const TASKS = new Set([
  "extract_claim",
  "suggest_fields",
  "summarize_evidence",
  "note_inconsistency",
  "missing_evidence_questions",
]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Stores an analyst-supplied AI draft. This route does not call a model and
 * does not change exact claim language or the human classification.
 */
export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyAiDraft",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const actor = getReviewActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = await request.json();
    const task = String(body.task ?? "");
    if (!TASKS.has(task)) {
      return NextResponse.json({ error: "Unsupported AI task." }, {
        status: 400,
      });
    }
    const draft = storeAiDraft(actor, id, {
      task: task as
        | "extract_claim"
        | "suggest_fields"
        | "summarize_evidence"
        | "note_inconsistency"
        | "missing_evidence_questions",
      model: String(body.model ?? ""),
      promptVersion: String(body.promptVersion ?? ""),
      inputSourceIds: Array.isArray(body.inputSourceIds)
        ? body.inputSourceIds.map(String)
        : [],
      draftText: String(body.draftText ?? ""),
    });
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      label: "AI-generated draft",
      draft,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid draft";
    return NextResponse.json(
      { error: message },
      { status: claimErrorStatus(error) },
    );
  }
}
