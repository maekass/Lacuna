/**
 * Gamma API — Poll generation status
 * Proxies GET to https://public-api.gamma.app/v1.0/generations/{id}
 */

import { NextRequest, NextResponse } from "next/server";

const GAMMA_API_BASE = "https://public-api.gamma.app/v1.0";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const apiKey = request.headers.get("x-gamma-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "x-gamma-key header is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${GAMMA_API_BASE}/generations/${id}`, {
      headers: {
        "X-API-KEY": apiKey,
      },
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
    console.error("Gamma status poll error:", _err);
    return NextResponse.json(
      { error: "Failed to poll Gamma generation status" },
      { status: 500 },
    );
  }
}
