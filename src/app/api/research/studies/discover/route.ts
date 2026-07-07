import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { discoverDomesticStudyCandidates } from "@/lib/research/domesticStudyDiscoveryLlm";
import { fetchResearchDiscoveryGrounding } from "@/lib/research/researchDiscoveryFetch";
import {
  RESEARCH_DISCOVERY_PRESET_IDS,
  type ResearchDiscoveryPresetId,
} from "@/lib/research/researchDiscoveryPresets";

const VALID_PRESETS = new Set<string>(RESEARCH_DISCOVERY_PRESET_IDS);

/** POST — LLM-assisted domestic study discovery grounded in NIH RePORTER + CT.gov. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await rateLimit({
    key: `studyDiscovery:${ip}`,
    limit: 6,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: limit.resetAtMs },
      { status: 429 },
    );
  }

  let presetId: ResearchDiscoveryPresetId = "mit";
  let maxCandidates = 8;

  try {
    const body = await request.json() as {
      presetId?: unknown;
      maxCandidates?: unknown;
    };
    if (
      typeof body.presetId === "string" &&
      VALID_PRESETS.has(body.presetId)
    ) {
      presetId = body.presetId as ResearchDiscoveryPresetId;
    }
    if (typeof body.maxCandidates === "number") {
      maxCandidates = Math.min(12, Math.max(1, Math.floor(body.maxCandidates)));
    }
  } catch {
    // default preset
  }

  try {
    const grounding = await fetchResearchDiscoveryGrounding(presetId);
    const result = await discoverDomesticStudyCandidates(grounding, {
      maxCandidates,
    });

    return NextResponse.json({
      ...result,
      disclaimer:
        "Staging candidates only — not merged into the catalog. Human review required before adding to domesticStudyCatalog.ts.",
      fetchedAt: grounding.fetchedAt,
    });
  } catch (error) {
    console.error("research studies discover error:", error);
    return NextResponse.json(
      { error: "Failed to discover study candidates" },
      { status: 500 },
    );
  }
}
