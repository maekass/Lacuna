/**
 * Gamma API — Start a generation job
 * Proxies POST to https://public-api.gamma.app/v1.0/generations
 * Client sends Gamma API key in request body (never stored server-side).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";

const GAMMA_API_BASE = "https://public-api.gamma.app/v1.0";
const MAX_INPUT_TEXT_CHARS = 40_000;
const MAX_TITLE_CHARS = 200;
const MAX_INSTRUCTIONS_CHARS = 2_000;
const MAX_NUM_CARDS = 60;
const FORMATS = new Set(["presentation", "document", "social", "webpage"]);
const TEXT_MODES = new Set(["generate", "condense", "preserve"]);

interface GammaGenerationRequest {
  apiKey: string;
  inputText: string;
  title?: string;
  format?: "presentation" | "document" | "social" | "webpage";
  textMode?: "generate" | "condense" | "preserve";
  numCards?: number;
  exportAs?: "pptx" | "pdf" | "png";
  additionalInstructions?: string;
}

/** Bound proxied payloads so the route cannot be used to hammer Gamma. */
function validateGenerationParams(
  body: GammaGenerationRequest,
): string | null {
  if (body.inputText.length > MAX_INPUT_TEXT_CHARS) {
    return `inputText exceeds ${MAX_INPUT_TEXT_CHARS} characters`;
  }
  if (body.title && body.title.length > MAX_TITLE_CHARS) {
    return `title exceeds ${MAX_TITLE_CHARS} characters`;
  }
  if (
    body.additionalInstructions &&
    body.additionalInstructions.length > MAX_INSTRUCTIONS_CHARS
  ) {
    return `additionalInstructions exceeds ${MAX_INSTRUCTIONS_CHARS} characters`;
  }
  if (body.format && !FORMATS.has(body.format)) {
    return "Unsupported format";
  }
  if (body.textMode && !TEXT_MODES.has(body.textMode)) {
    return "Unsupported textMode";
  }
  if (
    body.numCards !== undefined &&
    (!Number.isInteger(body.numCards) || body.numCards < 1 ||
      body.numCards > MAX_NUM_CARDS)
  ) {
    return `numCards must be an integer between 1 and ${MAX_NUM_CARDS}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const bucket = await rateLimit({
    key: `gammaGenerate:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: bucket.resetAtMs },
      { status: 429 },
    );
  }

  try {
    const body: GammaGenerationRequest = await request.json();

    if (!body.apiKey) {
      return NextResponse.json(
        { error: "Gamma API key is required" },
        { status: 400 },
      );
    }

    if (!body.inputText || body.inputText.length < 1) {
      return NextResponse.json(
        { error: "inputText is required" },
        { status: 400 },
      );
    }

    const invalid = validateGenerationParams(body);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const { apiKey, ...generationParams } = body;

    const response = await fetchWithTimeout(`${GAMMA_API_BASE}/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(generationParams),
      timeoutMs: 30_000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.message || `Gamma API error: ${response.status}`,
          details: errorData,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (_err) {
    console.error("Gamma generation error:", _err);
    return NextResponse.json(
      { error: "Failed to start Gamma generation" },
      { status: 500 },
    );
  }
}
