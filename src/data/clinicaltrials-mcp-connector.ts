/**
 * ClinicalTrials.gov MCP Connector
 * Queries ClinicalTrials.gov API to assess clinical evidence maturity.
 */

export interface ClinicalTrial {
  nctId: string;
  title: string;
  phase: TrialPhase;
  status: TrialStatus;
  sponsor: string;
  enrollmentCount: number;
  startDate: string;
  completionDate?: string;
  postedResults: boolean;
  resultsDate?: string;
  studyType: 'Interventional' | 'Observational' | 'Expanded Access';
  conditions: string[];
  interventions: string[];
  primaryOutcome?: string;
  hasPublishedResults: boolean;
  publicationDoi?: string;
  journalName?: string;
  isFlagshipJournal: boolean;
}

export type TrialPhase = 'PRECLINICAL' | 'EARLY_PHASE_1' | 'PHASE_1' | 'PHASE_1_2' | 'PHASE_2' | 'PHASE_2_3' | 'PHASE_3' | 'PHASE_4' | 'NA';
export type TrialStatus = 'RECRUITING' | 'ACTIVE_NOT_RECRUITING' | 'NOT_YET_RECRUITING' | 'COMPLETED' | 'SUSPENDED' | 'TERMINATED' | 'WITHDRAWN' | 'WITHHELD' | 'UNKNOWN';

export interface CompanyTrialProfile {
  companyId: string;
  companyName: string;
  trials: ClinicalTrial[];
  maxPhaseReached: TrialPhase;
  totalTrials: number;
  activeTrials: number;
  completedTrials: number;
  totalEnrollment: number;
  trialsWithResults: number;
  publicationsCount: number;
  flagshipPublications: number;
  earliestTrialDate: string;
  latestResultsDate?: string;
  clinicalMaturityScore: number;
}

export const PHASE_SCORES: Record<TrialPhase, number> = {
  'PRECLINICAL': 0, 'EARLY_PHASE_1': 10, 'PHASE_1': 20, 'PHASE_1_2': 30,
  'PHASE_2': 40, 'PHASE_2_3': 55, 'PHASE_3': 70, 'PHASE_4': 100, 'NA': 0
};

const FLAGSHIP_JOURNALS = ['JAMA', 'NEJM', 'Lancet', 'Nature Medicine', 'Cell', 'BMJ', 'Fertility and Sterility'];

export class ClinicalTrialsClient {
  private baseUrl = 'https://clinicaltrials.gov/api/query';

  async searchBySponsor(companyName: string): Promise<ClinicalTrial[]> {
    const params = new URLSearchParams();
    params.append('expr', this.buildSponsorQuery(companyName));
    params.append('fields', 'NCTId,BriefTitle,Phase,OverallStatus,LeadSponsorName,EnrollmentCount,StartDate,CompletionDate,HasResults,StudyType,Condition,InterventionName');
    params.append('min_rnk', '1');
    params.append('max_rnk', '100');
    params.append('fmt', 'json');

    try {
      const response = await fetch(`${this.baseUrl}/full_studies?${params.toString()}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (!data.FullStudiesResponse?.FullStudies) return [];
      return this.parseTrials(data.FullStudiesResponse.FullStudies);
    } catch (error) {
      console.error('ClinicalTrials.gov error:', error);
      return [];
    }
  }

  private buildSponsorQuery(companyName: string): string {
    const variants = this.generateNameVariants(companyName);
    return variants.map(v => `sponsor:"${v}"`).join(' OR ');
  }

  private generateNameVariants(name: string): string[] {
    const variants = new Set([name]);
    variants.add(name.replace(/\s+/g, ''));
    variants.add(name.replace(/\s+/g, '-'));
    variants.add(name.replace(/,\s*(Inc|LLC|Corp)\.?/i, ''));
    const firstWord = name.split(/\s+/)[0];
    if (firstWord.length > 3) variants.add(firstWord);
    return Array.from(variants);
  }

  private parseTrials(studies: any[]): ClinicalTrial[] {
    return studies.map(s => this.parseTrial(s));
  }

  private parseTrial(study: any): ClinicalTrial {
    const p = study.Study?.ProtocolSection || {};
    const d = study.Study?.DerivedSection || {};
    const id = p.IdentificationModule || {};
    const status = p.StatusModule || {};
    const sponsor = p.SponsorCollaboratorsModule || {};
    const design = p.DesignModule || {};
    const arms = p.ArmsInterventionsModule || {};
    const conditions = p.ConditionsModule || {};
    const pubs = d.PublicationModule?.PublicationList?.Publication || [];

    return {
      nctId: id.NCTId || '',
      title: id.BriefTitle || id.OfficialTitle || '',
      phase: this.parsePhase(design.PhaseList?.Phase?.[0] || 'NA'),
      status: this.parseStatus(status.OverallStatus || 'UNKNOWN'),
      sponsor: sponsor.LeadSponsor?.LeadSponsorName || '',
      enrollmentCount: parseInt(design.EnrollmentInfo?.EnrollmentCount) || 0,
      startDate: status.StartDate || '',
      completionDate: status.CompletionDate || undefined,
      postedResults: status.HasResults || false,
      resultsDate: status.ResultsFirstSubmitDate || undefined,
      studyType: (design.StudyType || 'Interventional') as any,
      conditions: conditions.ConditionList?.Condition || [],
      interventions: arms.InterventionList?.Intervention?.map((i: any) => i.InterventionName) || [],
      primaryOutcome: p.OutcomesModule?.PrimaryOutcomeList?.PrimaryOutcome?.[0]?.PrimaryOutcomeMeasure,
      hasPublishedResults: pubs.length > 0,
      publicationDoi: pubs[0]?.PublicationPMID || undefined,
      journalName: pubs[0]?.PublicationJournal || undefined,
      isFlagshipJournal: pubs.some((p: any) => FLAGSHIP_JOURNALS.some(j => p.PublicationJournal?.toLowerCase().includes(j.toLowerCase())))
    };
  }

  private parsePhase(phase: string): TrialPhase {
    const map: Record<string, TrialPhase> = {
      'EARLY_PHASE1': 'EARLY_PHASE_1', 'PHASE1': 'PHASE_1', 'PHASE1/PHASE2': 'PHASE_1_2',
      'PHASE2': 'PHASE_2', 'PHASE2/PHASE3': 'PHASE_2_3', 'PHASE3': 'PHASE_3', 'PHASE4': 'PHASE_4'
    };
    return map[phase?.toUpperCase()] || 'NA';
  }

  private parseStatus(status: string): TrialStatus {
    return (status?.toUpperCase().replace(/\s/g, '_') as TrialStatus) || 'UNKNOWN';
  }
}

export function calculateClinicalMaturityScore(profile: CompanyTrialProfile): number {
  if (profile.totalTrials === 0) return 0;
  const phaseScore = PHASE_SCORES[profile.maxPhaseReached];
  const resultsScore = profile.completedTrials > 0 ? (profile.trialsWithResults / profile.completedTrials * 50) : 0;
  const pubScore = profile.publicationsCount > 0 ? (profile.flagshipPublications > 0 ? 100 : 60) : 0;
  const activityScore = profile.activeTrials > 0 ? 20 : 0;
  return Math.round(phaseScore * 0.4 + resultsScore * 0.25 + pubScore * 0.2 + activityScore * 0.15);
}

export const clinicalTrialsClient = new ClinicalTrialsClient();
