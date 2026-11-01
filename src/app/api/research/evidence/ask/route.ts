import { handleEvidenceAskRequest } from "@/lib/ai/rag/answer";

/**
 * Read-only evidence ask. The model cannot approve or publish ledger claims.
 */
export function POST(request: Request) {
  return handleEvidenceAskRequest(request);
}
