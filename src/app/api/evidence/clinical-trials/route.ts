/**
 * ClinicalTrials.gov evidence connector — queries trials by sponsor/company name
 * for the evidence maturity scoring system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardedUpstreamFetch } from '@/lib/api/guardedFetch';

const CTG_API = 'https://clinicaltrials.gov/api/v2';

interface CTGStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      primaryCompletionDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
    };
    designModule?: {
      phases?: string[];
      enrollmentInfo?: { count?: number };
    };
    conditionsModule?: { conditions?: string[] };
    hasResults?: boolean;
  };
  hasResults?: boolean;
}

export interface CompanyTrialSummary {
  companyName: string;
  totalTrials: number;
  highestPhase: string;
  phaseBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  hasPostedResults: boolean;
  totalEnrollment: number;
  trials: Array<{
    nctId: string;
    title: string;
    phase: string;
    status: string;
    enrollment: number;
    conditions: string[];
    primaryCompletionDate?: string;
    hasResults: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  const company = request.nextUrl.searchParams.get('company');
  if (!company) {
    return NextResponse.json({ error: 'company parameter required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      'query.spons': company,
      pageSize: '50',
      sort: 'LastUpdatePostDate:desc',
    });

    const res = await guardedUpstreamFetch(
      `${CTG_API}/studies?${params}`,
      { headers: { Accept: 'application/json' } },
      { request, rateLimitKey: 'evidence-ctg', limit: 40, windowMs: 60_000 },
    );
    if (res instanceof NextResponse) return res;

    if (!res.ok) throw new Error(`CTG API ${res.status}`);

    const data = await res.json();
    const studies: CTGStudy[] = data.studies || [];

    const phaseBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    let hasPostedResults = false;
    let totalEnrollment = 0;

    const trials = studies.map((s) => {
      const proto = s.protocolSection || {};
      const design = proto.designModule || {};
      const statusMod = proto.statusModule || {};
      const phase = design.phases?.[0] || 'Not Applicable';
      const status = statusMod.overallStatus || 'Unknown';
      const enrollment = design.enrollmentInfo?.count || 0;
      const studyHasResults = s.hasResults ?? false;

      phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      totalEnrollment += enrollment;
      if (studyHasResults) hasPostedResults = true;

      return {
        nctId: proto.identificationModule?.nctId || '',
        title: proto.identificationModule?.briefTitle || '',
        phase,
        status,
        enrollment,
        conditions: proto.conditionsModule?.conditions || [],
        primaryCompletionDate: statusMod.primaryCompletionDateStruct?.date,
        hasResults: studyHasResults,
      };
    });

    const phaseOrder = ['PHASE3', 'PHASE2', 'PHASE1', 'EARLY_PHASE1', 'NA'];
    const highestPhase = phaseOrder.find((p) => phaseBreakdown[p]) || 'None';

    const summary: CompanyTrialSummary = {
      companyName: company,
      totalTrials: trials.length,
      highestPhase,
      phaseBreakdown,
      statusBreakdown,
      hasPostedResults,
      totalEnrollment,
      trials,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Evidence CTG error:', err);
    return NextResponse.json(
      { companyName: company, totalTrials: 0, trials: [], error: 'CTG unavailable' },
      { status: 502 },
    );
  }
}
