import { NextResponse } from "next/server";
import { withLlmDevHeaders } from "@/lib/ai/devHeaders";
import { resetLlmAccounting } from "@/lib/ai/inference";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";

/** Longest user question forwarded to the model. */
const MAX_QUESTION_LENGTH = 500;

interface GroundedAskRouteConfig<TSnapshot> {
  /** Rate-limit bucket prefix (8 requests / minute per IP). */
  rateLimitKey: string;
  /** Builds the JSON snapshot the answer must be grounded in. */
  buildSnapshot: (dataset: VerifiedDataset) => TSnapshot;
  answer: (snapshot: TSnapshot, question?: string) => Promise<unknown>;
  /** Prefix for the server-side error log. */
  logLabel: string;
  /** Client-facing message returned on failure. */
  errorMessage: string;
}

/** Reads an optional, length-capped `question` field from the request body. */
async function readQuestion(request: Request): Promise<string | undefined> {
  try {
    const body = await request.json() as { question?: unknown };
    if (typeof body.question === "string") {
      return body.question.slice(0, MAX_QUESTION_LENGTH);
    }
  } catch {
    // empty body → default question
  }
  return undefined;
}

/**
 * Handles the shared "ask a question about a pipeline snapshot" POST route:
 * rate limit → parse question → build snapshot → LLM answer → dev headers.
 */
export async function handleGroundedAskRequest<TSnapshot>(
  request: Request,
  config: GroundedAskRouteConfig<TSnapshot>,
): Promise<NextResponse> {
  const limited = await enforceRateLimit(request, {
    key: config.rateLimitKey,
    limit: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const question = await readQuestion(request);

  try {
    resetLlmAccounting();
    const dataset = await getVerifiedDataset();
    const result = await config.answer(
      config.buildSnapshot(dataset),
      question,
    );
    return withLlmDevHeaders(NextResponse.json(result));
  } catch (error) {
    console.error(`${config.logLabel} ask error:`, error);
    return NextResponse.json(
      { error: config.errorMessage },
      { status: 500 },
    );
  }
}
