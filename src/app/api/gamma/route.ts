/**
 * Gamma API — Start a generation job
 * Proxies POST to https://public-api.gamma.app/v1.0/generations
 * Client sends Gamma API key in request body (never stored server-side).
 */

import { NextRequest, NextResponse } from "next/server";

const GAMMA_API_BASE = "https://public-api.gamma.app/v1.0";

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

export async function POST(request: NextRequest) {
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

    const { apiKey, ...generationParams } = body;

    const response = await fetch(`${GAMMA_API_BASE}/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(generationParams),
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
