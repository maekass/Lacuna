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
  studyType: "Interventional" | "Observational" | "Expanded Access";
  conditions: string[];
  interventions: string[];
  primaryOutcome?: string;
  hasPublishedResults: boolean;
  publicationDoi?: string;
  journalName?: string;
  isFlagshipJournal: boolean;
}

export type TrialPhase =
  | "PRECLINICAL"
  | "EARLY_PHASE_1"
  | "PHASE_1"
  | "PHASE_1_2"
  | "PHASE_2"
  | "PHASE_2_3"
  | "PHASE_3"
  | "PHASE_4"
  | "NA";
export type TrialStatus =
  | "RECRUITING"
  | "ACTIVE_NOT_RECRUITING"
  | "NOT_YET_RECRUITING"
  | "COMPLETED"
  | "SUSPENDED"
  | "TERMINATED"
  | "WITHDRAWN"
  | "WITHHELD"
  | "UNKNOWN";

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
  "PRECLINICAL": 0,
  "EARLY_PHASE_1": 10,
  "PHASE_1": 20,
  "PHASE_1_2": 30,
  "PHASE_2": 40,
  "PHASE_2_3": 55,
  "PHASE_3": 70,
  "PHASE_4": 100,
  "NA": 0,
};

const FLAGSHIP_JOURNALS = [
  "JAMA",
  "NEJM",
  "Lancet",
  "Nature Medicine",
  "Cell",
  "BMJ",
  "Fertility and Sterility",
];

export class ClinicalTrialsClient {
  private baseUrl = "https://clinicaltrials.gov/api/query";

  async searchBySponsor(companyName: string): Promise<ClinicalTrial[]> {
    const params = new URLSearchParams();
    params.append("expr", this.buildSponsorQuery(companyName));
    params.append(
      "fields",
      "NCTId,BriefTitle,Phase,OverallStatus,LeadSponsorName,EnrollmentCount,StartDate,CompletionDate,HasResults,StudyType,Condition,InterventionName",
    );
    params.append("min_rnk", "1");
    params.append("max_rnk", "100");
    params.append("fmt", "json");

    try {
      const response = await fetch(
        `${this.baseUrl}/full_studies?${params.toString()}`,
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (!data.FullStudiesResponse?.FullStudies) return [];
      return this.parseTrials(data.FullStudiesResponse.FullStudies);
    } catch (error) {
      console.error("ClinicalTrials.gov error:", error);
      return [];
    }
  }

  private buildSponsorQuery(companyName: string): string {
    const variants = this.generateNameVariants(companyName);
    return variants.map((v) => `sponsor:"${v}"`).join(" OR ");
  }

  private generateNameVariants(name: string): string[] {
    const variants = new Set([name]);
    variants.add(name.replace(/\s+/g, ""));
    variants.add(name.replace(/\s+/g, "-"));
    variants.add(name.replace(/,\s*(Inc|LLC|Corp)\.?/i, ""));
    const firstWord = name.split(/\s+/)[0];
    if (firstWord.length > 3) variants.add(firstWord);
    return Array.from(variants);
  }

  private parseTrials(studies: unknown[]): ClinicalTrial[] {
    return studies.map((s) => this.parseTrial(s));
  }

  private parseTrial(study: unknown): ClinicalTrial {
    const root = this.asRecord(study);
    const studyNode = this.asRecord(root.Study);
    const protocol = this.asRecord(studyNode.ProtocolSection);
    const derived = this.asRecord(studyNode.DerivedSection);

    const id = this.asRecord(protocol.IdentificationModule);
    const status = this.asRecord(protocol.StatusModule);
    const sponsor = this.asRecord(protocol.SponsorCollaboratorsModule);
    const design = this.asRecord(protocol.DesignModule);
    const arms = this.asRecord(protocol.ArmsInterventionsModule);
    const conditions = this.asRecord(protocol.ConditionsModule);

    const pubModule = this.asRecord(derived.PublicationModule);
    const pubList = this.asRecord(pubModule.PublicationList);
    const pubs = this.asArray(pubList.Publication).map((p) => this.asRecord(p));

    return {
      nctId: this.asString(id.NCTId),
      title: this.asString(id.BriefTitle) || this.asString(id.OfficialTitle),
      phase: this.parsePhase(
        this.firstStringFromList(this.asRecord(design.PhaseList).Phase) || "NA",
      ),
      status: this.parseStatus(
        this.asString(status.OverallStatus) || "UNKNOWN",
      ),
      sponsor: this.asString(
        this.asRecord(this.asRecord(sponsor.LeadSponsor)).LeadSponsorName,
      ),
      enrollmentCount: this.parseIntSafe(
        this.asRecord(design.EnrollmentInfo).EnrollmentCount,
      ),
      startDate: this.asString(status.StartDate),
      completionDate: this.asOptionalString(status.CompletionDate),
      postedResults: this.asBoolean(status.HasResults),
      resultsDate: this.asOptionalString(status.ResultsFirstSubmitDate),
      studyType: this.parseStudyType(design.StudyType),
      conditions: this.asArray(
        this.asRecord(conditions.ConditionList).Condition,
      ).map((c) => this.asString(c)).filter(Boolean),
      interventions: this.asArray(
        this.asRecord(this.asRecord(arms.InterventionList)).Intervention,
      )
        .map((i) => this.asString(this.asRecord(i).InterventionName))
        .filter(Boolean),
      primaryOutcome: this.asOptionalString(
        this.asRecord(this.asRecord(protocol.OutcomesModule).PrimaryOutcomeList)
          .PrimaryOutcome &&
          this.asRecord(
            this.asArray(
              this.asRecord(
                this.asRecord(protocol.OutcomesModule).PrimaryOutcomeList,
              ).PrimaryOutcome,
            )[0],
          )
            .PrimaryOutcomeMeasure,
      ),
      hasPublishedResults: pubs.length > 0,
      publicationDoi: this.asOptionalString(pubs[0]?.PublicationPMID),
      journalName: this.asOptionalString(pubs[0]?.PublicationJournal),
      isFlagshipJournal: pubs.some((p) =>
        FLAGSHIP_JOURNALS.some((j) =>
          this.asString(p.PublicationJournal).toLowerCase().includes(
            j.toLowerCase(),
          )
        )
      ),
    };
  }

  private parsePhase(phase: string): TrialPhase {
    const map: Record<string, TrialPhase> = {
      "EARLY_PHASE1": "EARLY_PHASE_1",
      "PHASE1": "PHASE_1",
      "PHASE1/PHASE2": "PHASE_1_2",
      "PHASE2": "PHASE_2",
      "PHASE2/PHASE3": "PHASE_2_3",
      "PHASE3": "PHASE_3",
      "PHASE4": "PHASE_4",
    };
    return map[phase?.toUpperCase()] || "NA";
  }

  private parseStatus(status: string): TrialStatus {
    return (status?.toUpperCase().replace(/\s/g, "_") as TrialStatus) ||
      "UNKNOWN";
  }

  private parseStudyType(value: unknown): ClinicalTrial["studyType"] {
    const v = this.asString(value);
    if (
      v === "Interventional" || v === "Observational" || v === "Expanded Access"
    ) return v;
    return "Interventional";
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asString(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private asOptionalString(value: unknown): string | undefined {
    const s = this.asString(value);
    return s ? s : undefined;
  }

  private asBoolean(value: unknown): boolean {
    return value === true;
  }

  private parseIntSafe(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    const s = this.asString(value);
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  }

  private firstStringFromList(value: unknown): string | undefined {
    const arr = this.asArray(value);
    if (arr.length === 0) return undefined;
    const first = arr[0];
    const s = this.asString(first);
    return s ? s : undefined;
  }
}

export function calculateClinicalMaturityScore(
  profile: CompanyTrialProfile,
): number {
  if (profile.totalTrials === 0) return 0;
  const phaseScore = PHASE_SCORES[profile.maxPhaseReached];
  const resultsScore = profile.completedTrials > 0
    ? (profile.trialsWithResults / profile.completedTrials * 50)
    : 0;
  const pubScore = profile.publicationsCount > 0
    ? (profile.flagshipPublications > 0 ? 100 : 60)
    : 0;
  const activityScore = profile.activeTrials > 0 ? 20 : 0;
  return Math.round(
    phaseScore * 0.4 + resultsScore * 0.25 + pubScore * 0.2 +
      activityScore * 0.15,
  );
}

export const clinicalTrialsClient = new ClinicalTrialsClient();
