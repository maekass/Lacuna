import { logReviewAction } from "@/lib/ingestion/reviewAuditLog";
import type { ReviewAuditAction } from "@/lib/ingestion/reviewAuditLog";
import { getReviewActor } from "@/lib/infra/reviewAuth";

/** Log a review action when an authenticated actor is present. */
export async function auditReviewRequest(
  request: Request,
  input: {
    dealId?: string | null;
    action: ReviewAuditAction;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const actor = getReviewActor(request);
  if (!actor) return;

  await logReviewAction({
    dealId: input.dealId,
    action: input.action,
    actorId: actor.id,
    actorMethod: actor.method,
    metadata: input.metadata,
  });
}
