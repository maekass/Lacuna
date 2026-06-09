/**
 * ClinicalTrials.gov API Integration
 * Ported from windsurf-project Python implementation
 * Provides real-time access to clinical trial data
 */

import { NextRequest, NextResponse } from "next/server";
import { clampInt } from "@/lib/api/pageParams";

const CLINICAL_TRIALS_API_BASE = "https://clinicaltrials.gov/api/v2";
const DEFAULT_TRIAL_LIMIT = 10;
const MAX_TRIAL_LIMIT = 100;
const MAX_BATCH_NCT_IDS = 25;

// ClinicalTrials.gov API types
interface CTGStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
    };
    designModule?: {
      phases?: string[];
      enrollmentInfo?: { count?: number };
    };
    conditionsModule?: {
      conditions?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{ name?: string }>;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: {
          name?: string;
          address?: { city?: string };
        };
      }>;
    };
  };
}

interface CTGResponse {
  studies?: CTGStudy[];
  totalCount?: number;
}

export interface ClinicalTrial {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  condition: string;
  sponsor: string;
  enrollment: number;
  startDate: string;
  completionDate?: string;
  locations: string[];
  interventions: string[];
}

// Search trials endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const condition = searchParams.get("condition") || "";
  const sponsor = searchParams.get("sponsor") || "";
  const phase = searchParams.get("phase") || "";
  const status = searchParams.get("status") || "";
  const limit = clampInt(
    searchParams.get("limit"),
    DEFAULT_TRIAL_LIMIT,
    MAX_TRIAL_LIMIT,
  );

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (condition) params.append("query.cond", condition);
    if (sponsor) params.append("query.spons", sponsor);
    if (phase) params.append("filter.phase", phase);
    if (status) params.append("filter.status", status);
    params.append("pageSize", limit.toString());
    params.append("sort", "LastUpdatePostDate:desc");

    const response = await fetch(
      `${CLINICAL_TRIALS_API_BASE}/studies?${params.toString()}`,
      {
        headers: {
          "Accept": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    const ctgData = data as CTGResponse;
    const trials: ClinicalTrial[] = (ctgData.studies || []).map(
      (study: CTGStudy) => {
        const protocol = study.protocolSection || {};
        const status = protocol.statusModule || {};
        const identification = protocol.identificationModule || {};
        const sponsor = protocol.sponsorCollaboratorsModule || {};
        const design = protocol.designModule || {};
        const arms = protocol.armsInterventionsModule || {};
        const contacts = protocol.contactsLocationsModule || {};

        return {
          nctId: identification.nctId || "",
          title: identification.briefTitle || "",
          phase: design.phases?.[0] || "Not Applicable",
          status: status.overallStatus || "Unknown",
          condition: (protocol.conditionsModule?.conditions || []).join(", "),
          sponsor: sponsor.leadSponsor?.name || "Unknown",
          enrollment: design.enrollmentInfo?.count || 0,
          startDate: status.startDateStruct?.date || "",
          completionDate: status.completionDateStruct?.date,
          locations: (contacts.locations || []).map((loc) =>
            `${loc.facility?.name || ""}, ${loc.facility?.address?.city || ""}`
          ).filter(Boolean),
          interventions: (arms.interventions || []).map((int) => int.name || "")
            .filter(Boolean),
        };
      },
    );

    return NextResponse.json({
      trials,
      total: ctgData.totalCount || trials.length,
      query: {
        condition,
        sponsor,
        phase,
        status,
      },
    });
  } catch (_err) {
    console.error("ClinicalTrials.gov API error:", _err);

    return NextResponse.json(
      {
        trials: [] as ClinicalTrial[],
        total: 0,
        query: { condition, phase, status },
        error:
          "ClinicalTrials.gov is unavailable. No placeholder trials are returned.",
      },
      { status: 502 },
    );
  }
}

// POST endpoint for batch trial lookup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nctIds } = body;

    if (!Array.isArray(nctIds)) {
      return NextResponse.json(
        { error: "nctIds must be an array" },
        { status: 400 },
      );
    }

    if (nctIds.length > MAX_BATCH_NCT_IDS) {
      return NextResponse.json(
        { error: `nctIds exceeds maximum batch size of ${MAX_BATCH_NCT_IDS}` },
        { status: 400 },
      );
    }

    // Fetch multiple trials in parallel
    const trials = await Promise.all(
      nctIds.map(async (nctId) => {
        try {
          const response = await fetch(
            `${CLINICAL_TRIALS_API_BASE}/studies/${nctId}`,
            { headers: { "Accept": "application/json" } },
          );

          if (!response.ok) return null;

          const data = await response.json();
          const protocol = data.protocolSection || {};

          return {
            nctId,
            title: protocol.identificationModule?.briefTitle || "",
            phase: protocol.designModule?.phases?.[0] || "N/A",
            status: protocol.statusModule?.overallStatus || "Unknown",
            condition: (protocol.conditionsModule?.conditions || []).join(", "),
            sponsor: protocol.sponsorCollaboratorsModule?.leadSponsor?.name ||
              "Unknown",
          };
        } catch {
          return null;
        }
      }),
    );

    return NextResponse.json({
      trials: trials.filter(Boolean),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch trials" },
      { status: 500 },
    );
  }
}
