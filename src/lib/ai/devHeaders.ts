/**
 * Dev-only helpers for surfacing LLM cost accounting on API responses.
 */

import { NextResponse } from "next/server";
import { formatLlmCostHeader, getLastLlmAccounting } from "@/lib/ai/inference";

/** Attach `x-lacuna-llm-cost` in development when inference ran this request. */
export function withLlmDevHeaders(response: NextResponse): NextResponse {
  if (process.env.NODE_ENV !== "development") return response;
  const accounting = getLastLlmAccounting();
  if (!accounting) return response;
  response.headers.set("x-lacuna-llm-cost", formatLlmCostHeader(accounting));
  return response;
}
