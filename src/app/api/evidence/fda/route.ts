/**
 * openFDA evidence connector — queries device clearances (510k, PMA, De Novo)
 * and drug approvals (NDA, ANDA) by company name.
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENFDA_BASE = 'https://api.fda.gov';

interface DeviceResult {
  k_number?: string;
  pma_number?: string;
  openfda?: { device_name?: string; device_class?: string };
  clearance_type?: string;
  decision_date?: string;
  advisory_committee_description?: string;
  product_code?: string;
  applicant?: string;
}

interface DrugResult {
  application_number?: string;
  sponsor_name?: string;
  openfda?: { brand_name?: string[]; generic_name?: string[] };
  products?: Array<{
    dosage_form?: string;
    marketing_status?: string;
  }>;
  submissions?: Array<{
    submission_type?: string;
    submission_status?: string;
    submission_status_date?: string;
  }>;
}

export interface FDACompanySummary {
  companyName: string;
  devices: Array<{
    number: string;
    name: string;
    clearanceType: string;
    deviceClass: string;
    decisionDate: string;
    advisoryCommittee: string;
  }>;
  drugs: Array<{
    applicationNumber: string;
    brandName: string;
    genericName: string;
    submissionType: string;
    approvalDate: string;
    marketingStatus: string;
  }>;
  highestDeviceClearance: string;
  hasDrugApproval: boolean;
  totalProducts: number;
}

export async function GET(request: NextRequest) {
  const company = request.nextUrl.searchParams.get('company');
  if (!company) {
    return NextResponse.json({ error: 'company parameter required' }, { status: 400 });
  }

  try {
    const [deviceData, drugData] = await Promise.all([
      fetchDevices(company),
      fetchDrugs(company),
    ]);

    const clearanceRank: Record<string, number> = {
      PMA: 3,
      'DE NOVO': 2,
      '510(K)': 1,
    };
    const highestDeviceClearance = deviceData.reduce(
      (best, d) => {
        const rank = clearanceRank[d.clearanceType.toUpperCase()] || 0;
        return rank > (clearanceRank[best.toUpperCase()] || 0) ? d.clearanceType : best;
      },
      'None',
    );

    const summary: FDACompanySummary = {
      companyName: company,
      devices: deviceData,
      drugs: drugData,
      highestDeviceClearance,
      hasDrugApproval: drugData.length > 0,
      totalProducts: deviceData.length + drugData.length,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error('openFDA error:', err);
    return NextResponse.json(
      { companyName: company, devices: [], drugs: [], totalProducts: 0, error: 'openFDA unavailable' },
      { status: 502 },
    );
  }
}

async function fetchDevices(company: string): Promise<FDACompanySummary['devices']> {
  try {
    const encoded = encodeURIComponent(`"${company}"`);
    const res = await fetch(
      `${OPENFDA_BASE}/device/510k.json?search=applicant:${encoded}&limit=10`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    const results: DeviceResult[] = data.results || [];

    return results.map((r) => ({
      number: r.k_number || r.pma_number || '',
      name: r.openfda?.device_name || '',
      clearanceType: r.clearance_type || '510(K)',
      deviceClass: r.openfda?.device_class || '',
      decisionDate: r.decision_date || '',
      advisoryCommittee: r.advisory_committee_description || '',
    }));
  } catch {
    return [];
  }
}

async function fetchDrugs(company: string): Promise<FDACompanySummary['drugs']> {
  try {
    const encoded = encodeURIComponent(`"${company}"`);
    const res = await fetch(
      `${OPENFDA_BASE}/drug/drugsfda.json?search=sponsor_name:${encoded}&limit=10`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    const results: DrugResult[] = data.results || [];

    return results.map((r) => {
      const latestSubmission = r.submissions
        ?.filter((s) => s.submission_status === 'AP')
        .sort((a, b) => (b.submission_status_date || '').localeCompare(a.submission_status_date || ''))[0];

      return {
        applicationNumber: r.application_number || '',
        brandName: r.openfda?.brand_name?.[0] || '',
        genericName: r.openfda?.generic_name?.[0] || '',
        submissionType: latestSubmission?.submission_type || 'NDA',
        approvalDate: latestSubmission?.submission_status_date || '',
        marketingStatus: r.products?.[0]?.marketing_status || '',
      };
    });
  } catch {
    return [];
  }
}
