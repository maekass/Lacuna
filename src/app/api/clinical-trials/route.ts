/**
 * ClinicalTrials.gov API Integration
 * Ported from windsurf-project Python implementation
 * Provides real-time access to clinical trial data
 */

import { NextRequest, NextResponse } from 'next/server';

const CLINICAL_TRIALS_API_BASE = 'https://clinicaltrials.gov/api/v2';

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
  const condition = searchParams.get('condition') || '';
  const phase = searchParams.get('phase') || '';
  const status = searchParams.get('status') || '';
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (condition) params.append('query.cond', condition);
    if (phase) params.append('filter.phase', phase);
    if (status) params.append('filter.status', status);
    params.append('pageSize', limit.toString());
    params.append('sort', 'LastUpdatePostDate:desc');

    const response = await fetch(
      `${CLINICAL_TRIALS_API_BASE}/studies?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    const ctgData = data as CTGResponse;
    const trials: ClinicalTrial[] = (ctgData.studies || []).map((study: CTGStudy) => {
      const protocol = study.protocolSection || {};
      const status = protocol.statusModule || {};
      const identification = protocol.identificationModule || {};
      const sponsor = protocol.sponsorCollaboratorsModule || {};
      const design = protocol.designModule || {};
      const arms = protocol.armsInterventionsModule || {};
      const contacts = protocol.contactsLocationsModule || {};

      return {
        nctId: identification.nctId || '',
        title: identification.briefTitle || '',
        phase: design.phases?.[0] || 'Not Applicable',
        status: status.overallStatus || 'Unknown',
        condition: (protocol.conditionsModule?.conditions || []).join(', '),
        sponsor: sponsor.leadSponsor?.name || 'Unknown',
        enrollment: design.enrollmentInfo?.count || 0,
        startDate: status.startDateStruct?.date || '',
        completionDate: status.completionDateStruct?.date,
        locations: (contacts.locations || []).map((loc) => 
          `${loc.facility?.name || ''}, ${loc.facility?.address?.city || ''}`
        ).filter(Boolean),
        interventions: (arms.interventions || []).map((int) => 
          int.name || ''
        ).filter(Boolean)
      };
    });

    return NextResponse.json({
      trials,
      total: ctgData.totalCount || trials.length,
      query: {
        condition,
        phase,
        status
      }
    });

  } catch (_err) {
    console.error('ClinicalTrials.gov API error:', _err);
    
    // Return fallback data for development
    return NextResponse.json({
      trials: getFallbackTrials(condition),
      total: 5,
      query: { condition, phase, status },
      fallback: true
    });
  }
}

// Fallback trials for development/testing
function getFallbackTrials(condition: string): ClinicalTrial[] {
  const baseTrials: ClinicalTrial[] = [
    {
      nctId: 'NCT05123456',
      title: 'Maternal Health Monitoring in High-Risk Populations',
      phase: 'Phase 3',
      status: 'Recruiting',
      condition: 'Maternal Health, Pregnancy Complications',
      sponsor: 'Johns Hopkins University',
      enrollment: 500,
      startDate: '2024-01-15',
      completionDate: '2026-06-30',
      locations: ['Baltimore, MD', 'Atlanta, GA'],
      interventions: ['Remote monitoring device', 'Telehealth platform']
    },
    {
      nctId: 'NCT05234567',
      title: 'Novel Treatment for Uterine Fibroids',
      phase: 'Phase 2',
      status: 'Active, not recruiting',
      condition: 'Uterine Fibroids',
      sponsor: 'NIH/NICHD',
      enrollment: 200,
      startDate: '2023-06-01',
      completionDate: '2025-12-31',
      locations: ['Bethesda, MD', 'Boston, MA'],
      interventions: ['Ulipristal acetate', 'Placebo']
    },
    {
      nctId: 'NCT05345678',
      title: 'Lupus Nephritis Biomarker Study',
      phase: 'Phase 1',
      status: 'Recruiting',
      condition: 'Systemic Lupus Erythematosus',
      sponsor: 'Lupus Research Alliance',
      enrollment: 100,
      startDate: '2024-03-01',
      completionDate: '2025-03-01',
      locations: ['New York, NY', 'Chicago, IL'],
      interventions: ['Blood sample collection', 'Biomarker analysis']
    },
    {
      nctId: 'NCT05456789',
      title: 'Gene Therapy for Sickle Cell Disease',
      phase: 'Phase 3',
      status: 'Active, not recruiting',
      condition: 'Sickle Cell Disease',
      sponsor: 'bluebird bio',
      enrollment: 35,
      startDate: '2022-09-01',
      completionDate: '2027-09-01',
      locations: ['Boston, MA', 'Memphis, TN'],
      interventions: ['LentiGlobin gene therapy']
    },
    {
      nctId: 'NCT05567890',
      title: 'Cardiovascular Risk in Black Women',
      phase: 'Phase 2',
      status: 'Recruiting',
      condition: 'Cardiovascular Disease',
      sponsor: 'American Heart Association',
      enrollment: 300,
      startDate: '2024-02-01',
      completionDate: '2026-08-31',
      locations: ['Multiple US sites'],
      interventions: ['Wearable monitoring', 'Lifestyle intervention']
    }
  ];

  if (!condition) return baseTrials;

  // Filter by condition if provided
  return baseTrials.filter(trial => 
    trial.condition.toLowerCase().includes(condition.toLowerCase())
  );
}

// POST endpoint for batch trial lookup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nctIds } = body;

    if (!Array.isArray(nctIds)) {
      return NextResponse.json(
        { error: 'nctIds must be an array' },
        { status: 400 }
      );
    }

    // Fetch multiple trials in parallel
    const trials = await Promise.all(
      nctIds.map(async (nctId) => {
        try {
          const response = await fetch(
            `${CLINICAL_TRIALS_API_BASE}/studies/${nctId}`,
            { headers: { 'Accept': 'application/json' } }
          );
          
          if (!response.ok) return null;
          
          const data = await response.json();
          const protocol = data.protocolSection || {};
          
          return {
            nctId,
            title: protocol.identificationModule?.briefTitle || '',
            phase: protocol.designModule?.phases?.[0] || 'N/A',
            status: protocol.statusModule?.overallStatus || 'Unknown',
            condition: (protocol.conditionsModule?.conditions || []).join(', '),
            sponsor: protocol.sponsorCollaboratorsModule?.leadSponsor?.name || 'Unknown'
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      trials: trials.filter(Boolean)
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trials' },
      { status: 500 }
    );
  }
}
