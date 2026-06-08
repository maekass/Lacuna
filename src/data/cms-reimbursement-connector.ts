/**
 * CMS Reimbursement Reference (local snapshot)
 *
 * ⚠️  THIS IS NOT A LIVE CMS API CLIENT.
 *
 * This module ships a small curated snapshot of publicly available CMS
 * reimbursement reference data, plus heuristics for matching Lacuna
 * companies to CPT/HCPCS codes and inferring valuation impact. Despite the
 * "Connector" name (preserved for backward compatibility with existing
 * imports), no network calls are made — everything is local.
 *
 * Confidence tiers used in this module (mirrors the OAIS framework in
 * `src/lib/impact/oaisCalculator.ts`):
 *   🟢 MEASURED     — sourced directly from CMS MPFS or peer-reviewed work
 *   🟡 PROXY        — derived heuristic with documented assumptions
 *   🔴 ILLUSTRATIVE — industry-rule-of-thumb estimate; replace with sourced
 *                  data before external reporting
 *
 * Required source updates before production / external reporting:
 *   - CPT base rates: refresh from current MPFS conversion factor (rates
 *     here are a 2024 final-rule snapshot)
 *   - Sector avgCoverage %: replace with sourced payer-coverage data
 *     (e.g. Milliman, AIS Health)
 *   - Valuation multiples: replace with CB Insights / PitchBook / disclosed-
 *     comparable data
 *
 * Originally added in commit b286c0c (May 2026).
 *
 * Reference URLs:
 * - CMS Physician Fee Schedule: https://www.cms.gov/medicare/payment/fee-schedules/physician
 * - HCPCS quarterly updates: https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system
 * - AMA CPT: https://www.ama-assn.org/practice-management/cpt
 */

// Types
export interface CPTCode {
  code: string;
  description: string;
  category: string;
  rvuWork: number;
  rvuPracticeExpense: number;
  rvuMalpractice: number;
  totalRVU: number;
  medicareRate: number;
  status: 'active' | 'inactive' | 'deleted';
  effectiveDate: string;
  modifier?: string[];
}

export interface HCPCSCode {
  code: string;
  description: string;
  shortDescription: string;
  category: string;
  status: 'active' | 'inactive';
  coverageType: 'A' | 'B' | 'C' | 'D' | 'E' | 'M';
  /*
   * A = Services covered
   * B = Services not covered
   * C = Carrier judgement
   * D = Special coverage instructions
   * E = Excluded from PFS
   * M = Not valid for Medicare
   */
}

export interface ReimbursementData {
  code: string;
  description: string;
  medicareReimbursement: number;
  commercialReimbursement: number;
  stateVariability: 'low' | 'medium' | 'high';
  payerCoverage: PayerCoverage[];
  rvuTotal: number;
  requiresPriorAuth: boolean;
  telehealthEligible: boolean;
}

export interface PayerCoverage {
  payer: string;
  covers: boolean;
  coverageLevel: 'full' | 'partial' | 'case-by-case';
  notes?: string;
}

export interface CompanyReimbursementProfile {
  companyName: string;
  productName: string;
  sector: string;
  matchedCodes: MatchedCode[];
  reimbursementStatus: ReimbursementStatus;
  businessModel: BusinessModel;
  estimatedReimbursementPercentage: number;
  valuationImpact: ValuationImpact;
}

export interface MatchedCode {
  code: string;
  description: string;
  matchConfidence: number;
  matchReason: string;
  medicareRate: number;
  frequency: number;
}

export interface ReimbursementStatus {
  hasCPTCode: boolean;
  codeType: 'established' | 'new' | 'category3' | 'none';
  codeCount: number;
  reimbursementBreadth: 'medicare-only' | 'multi-payer' | 'global' | 'none';
  rateCategory: 'low' | 'medium' | 'high' | 'none';
  estimatedAnnualReimbursement: number;
}

export interface ValuationImpact {
  reimbursementMultiple: number;
  benchmarkMultiple: number;
  premiumFactor: number;
  confidence: 'high' | 'medium' | 'low';
  comparableAnalysis: ComparableCompany[];
}

export interface ComparableCompany {
  name: string;
  sector: string;
  reimbursementStatus: string;
  valuationMultiple: number;
  acquisitionPrice?: number;
}

export type BusinessModel = 
  | 'insurance-driven'  // B2B payer, strong margins
  | 'b2c-consumer'      // Limited reimbursement, cash pay
  | 'hybrid'            // Some insurance, some direct pay
  | 'unclear';

/**
 * Default assumed annual usage per CPT code, used when no real frequency
 * data is available (🔴 ILLUSTRATIVE).
 *
 * Replace with actual claim-volume data (e.g. from CMS Public Use Files)
 * when available. Current value is a flat heuristic and will systematically
 * over- or under-estimate depending on the procedure.
 */
export const DEFAULT_ANNUAL_USES_PER_CODE = 100;

/**
 * Sector-level reimbursement benchmarks (🔴 ILLUSTRATIVE).
 *
 * `avgCoverage` is an industry rule-of-thumb estimate for the percentage
 * of sector services typically reimbursed by commercial / Medicare payers.
 * These values are curated heuristics, not sourced from a single citable
 * dataset — treat them as starting points and replace with sourced payer-
 * coverage data before external use.
 *
 * `typicalCodes` references real CPT codes; the sector-to-code mapping is
 * curated by hand and may not be exhaustive.
 */
// Sector reimbursement patterns (industry benchmarks)
export const SECTOR_REIMBURSEMENT_PATTERNS: Record<string, {
  avgCoverage: number;
  typicalCodes: string[];
  reimbursementLevel: 'high' | 'medium' | 'low';
  notes: string;
}> = {
  fertility: {
    avgCoverage: 15,
    typicalCodes: ['58321', '58322', '58970', '89250'],
    reimbursementLevel: 'low',
    notes: 'Most fertility services are cash pay; only diagnostics covered'
  },
  maternal_health: {
    avgCoverage: 65,
    typicalCodes: ['59400', '59510', '59618', '76801', '76805'],
    reimbursementLevel: 'high',
    notes: 'Pregnancy and delivery well-covered; prenatal care standard'
  },
  mental_health: {
    avgCoverage: 80,
    typicalCodes: ['90791', '90834', '90837', '96116', '96127'],
    reimbursementLevel: 'high',
    notes: 'Mental health parity laws mandate coverage'
  },
  gynecology: {
    avgCoverage: 90,
    typicalCodes: ['57420', '57421', '58100', '58300', '58558'],
    reimbursementLevel: 'high',
    notes: 'Standard procedures well-established with clear CPT codes'
  },
  pelvic_health: {
    avgCoverage: 55,
    typicalCodes: ['51741', '51798', '57288', '57289'],
    reimbursementLevel: 'medium',
    notes: 'Mixed coverage; emerging field with evolving codes'
  },
  menopause: {
    avgCoverage: 45,
    typicalCodes: ['99213', '99214', '84443', '82671'],
    reimbursementLevel: 'medium',
    notes: 'Hormone therapy and diagnostics covered; wellness limited'
  },
  contraception: {
    avgCoverage: 85,
    typicalCodes: ['58300', '58301', 'J7300', 'J7302'],
    reimbursementLevel: 'high',
    notes: 'ACA mandates contraceptive coverage without cost sharing'
  },
  breast_health: {
    avgCoverage: 95,
    typicalCodes: ['77067', '77063', '19101', '38525'],
    reimbursementLevel: 'high',
    notes: 'Screening and diagnostics comprehensive; cancer coverage strong'
  },
  wearable_monitoring: {
    avgCoverage: 25,
    typicalCodes: ['99453', '99454', '99457', '99458'],
    reimbursementLevel: 'low',
    notes: 'Remote patient monitoring emerging; limited codes available'
  },
  digital_therapeutics: {
    avgCoverage: 35,
    typicalCodes: ['98960', '99421', '99422', '99423'],
    reimbursementLevel: 'medium',
    notes: 'New category; some codes established but coverage varies'
  }
};

/**
 * Valuation multiples by reimbursement strength (🔴 ILLUSTRATIVE).
 *
 * Industry rule-of-thumb starting points for revenue-multiple comparisons.
 * Real-world multiples depend heavily on growth rate, margin profile, deal
 * structure, and market conditions. The `examples` list cites public deals
 * but the multiples themselves are not pulled from any specific transaction
 * — replace with comparable-set data from CB Insights / PitchBook before
 * reporting externally.
 */
// Valuation multiples by reimbursement type (industry benchmarks)
export const VALUATION_MULTIPLES = {
  reimbursement_rich: {
    multiple: 5.2,
    description: 'Multiple CPT codes, high RVU, multi-payer',
    examples: ['Teladoc (acquired Livongo)', 'Ro Health']
  },
  moderate_reimbursement: {
    multiple: 2.8,
    description: '1-2 codes, medium RVU, limited payers',
    examples: ['Modern Fertility', 'Tia']
  },
  limited_reimbursement: {
    multiple: 1.5,
    description: 'No CPT codes or consumer-only model',
    examples: ['Flo', 'Clue', 'Natural Cycles']
  }
};

// Cached CPT/HCPCS data store
class CMSDataStore {
  private cptCodes: Map<string, CPTCode> = new Map();
  private hcpcsCodes: Map<string, HCPCSCode> = new Map();
  private isLoaded: boolean = false;

  loadData(): void {
    if (this.isLoaded) return;
    this.loadFallbackData();
  }

  /**
   * Loads the curated snapshot of essential women's-health CPT codes
   * (🟢 MEASURED — values are from the CMS MPFS 2024 final rule).
   *
   * Only 3 codes are bundled today; this is the entire dataset — there is
   * no upstream "real" load path. To expand coverage, either:
   *   1. Append more rows to `essentialCodes` below (and cite the snapshot year), or
   *   2. Wire a real CMS ingestion path (e.g. quarterly HCPCS update files)
   *      and replace this method.
   */
  private loadFallbackData(): void {
    // Essential women's health CPT codes — CMS MPFS 2024 final rule snapshot
    const essentialCodes: CPTCode[] = [
      {
        code: '59400',
        description: 'Obstetrical care, antepartum, delivery, postpartum',
        category: 'Maternity',
        rvuWork: 29.55,
        rvuPracticeExpense: 12.32,
        rvuMalpractice: 3.21,
        totalRVU: 45.08,
        medicareRate: 1548.64, // 🟢 CMS MPFS 2024 final rule
        status: 'active',
        effectiveDate: '2024-01-01' // MPFS 2024 effective date
      },
      {
        code: '76801',
        description: 'Ultrasound, pregnant uterus, first trimester',
        category: 'Diagnostics',
        rvuWork: 2.12,
        rvuPracticeExpense: 3.45,
        rvuMalpractice: 0.28,
        totalRVU: 5.85,
        medicareRate: 201.33, // 🟢 CMS MPFS 2024 final rule
        status: 'active',
        effectiveDate: '2024-01-01'
      },
      {
        code: '90791',
        description: 'Psychiatric diagnostic evaluation',
        category: 'Mental Health',
        rvuWork: 2.68,
        rvuPracticeExpense: 0.89,
        rvuMalpractice: 0.15,
        totalRVU: 3.72,
        medicareRate: 128.01, // 🟢 CMS MPFS 2024 final rule
        status: 'active',
        effectiveDate: '2024-01-01'
      }
    ];

    essentialCodes.forEach(code => this.cptCodes.set(code.code, code));
    this.isLoaded = true;
  }

  getCPTCode(code: string): CPTCode | undefined {
    return this.cptCodes.get(code);
  }

  getHCPCSCode(code: string): HCPCSCode | undefined {
    return this.hcpcsCodes.get(code);
  }

  searchByDescription(query: string): CPTCode[] {
    const results: CPTCode[] = [];
    const queryLower = query.toLowerCase();

    for (const code of this.cptCodes.values()) {
      if (code.description.toLowerCase().includes(queryLower)) {
        results.push(code);
      }
    }

    return results;
  }

  getAllCodes(): CPTCode[] {
    return Array.from(this.cptCodes.values());
  }
}

// Singleton instance
const cmsDataStore = new CMSDataStore();

/**
 * Reference / calculator for CMS reimbursement data.
 *
 * NOTE: Class name is `CMSReimbursementConnector` for backward compatibility
 * with existing imports — it does NOT make network calls. All data is loaded
 * from the local snapshot in `CMSDataStore`. To consume real-time CMS data,
 * wire a fetch-based ingestion layer and feed it into this calculator.
 */
// Main connector class
export class CMSReimbursementConnector {
  private dataStore = cmsDataStore;

  async initialize(): Promise<void> {
    await this.dataStore.loadData();
  }

  /**
   * Get CPT code details
   */
  getCPTCode(code: string): CPTCode | undefined {
    return this.dataStore.getCPTCode(code);
  }

  /**
   * Search CPT codes by description
   */
  searchCPTCodes(query: string): CPTCode[] {
    return this.dataStore.searchByDescription(query);
  }

  /**
   * Match company product to CPT codes using fuzzy matching
   */
  matchProductToCodes(
    productName: string,
    productDescription: string,
    sector: string
  ): MatchedCode[] {
    const matches: MatchedCode[] = [];
    const searchTerms = this.extractSearchTerms(productName, productDescription, sector);

    // Search for matches
    for (const term of searchTerms) {
      const codes = this.searchCPTCodes(term);
      
      for (const code of codes) {
        const confidence = this.calculateMatchConfidence(
          productName,
          productDescription,
          code,
          sector
        );

        if (confidence > 0.3) { // Threshold for relevance
          matches.push({
            code: code.code,
            description: code.description,
            matchConfidence: confidence,
            matchReason: `Matched on: ${term}`,
            medicareRate: code.medicareRate,
            frequency: 1
          });
        }
      }
    }

    // Deduplicate and sort by confidence
    const uniqueMatches = this.deduplicateMatches(matches);
    return uniqueMatches.sort((a, b) => b.matchConfidence - a.matchConfidence);
  }

  /**
   * Extract search terms from product info
   */
  private extractSearchTerms(name: string, description: string, sector: string): string[] {
    const terms: string[] = [];
    
    // Add product name keywords
    terms.push(...name.toLowerCase().split(/\s+/));
    
    // Add description keywords
    if (description) {
      terms.push(...description.toLowerCase().split(/\s+/));
    }
    
    // Add sector-specific keywords
    const sectorKeywords: Record<string, string[]> = {
      fertility: ['fertility', 'ivf', 'insemination', 'egg', 'embryo', 'conception'],
      maternal_health: ['pregnancy', 'prenatal', 'maternity', 'obstetric', 'delivery'],
      mental_health: ['therapy', 'counseling', 'psychiatric', 'psychology', 'mental'],
      gynecology: ['gynecology', 'pap', 'smear', 'exam', 'pelvic'],
      pelvic_health: ['pelvic', 'incontinence', 'floor', 'bladder'],
      menopause: ['menopause', 'hormone', 'hot flash', 'estrogen'],
      contraception: ['contraception', 'birth control', 'iud', 'implant'],
      breast_health: ['mammogram', 'breast', 'cancer', 'screening'],
      wearable_monitoring: ['monitoring', 'wearable', 'tracking', 'sensor'],
      digital_therapeutics: ['digital', 'therapeutic', 'app', 'program']
    };

    if (sectorKeywords[sector]) {
      terms.push(...sectorKeywords[sector]);
    }

    return [...new Set(terms)]; // Deduplicate
  }

  /**
   * Calculate match confidence score
   */
  private calculateMatchConfidence(
    productName: string,
    productDescription: string,
    cptCode: CPTCode,
    sector: string
  ): number {
    let score = 0;
    const productText = `${productName} ${productDescription || ''}`.toLowerCase();
    const codeDesc = cptCode.description.toLowerCase();

    // Exact word matches
    const productWords = productText.split(/\s+/);
    const codeWords = codeDesc.split(/\s+/);
    
    const commonWords = productWords.filter(w => codeWords.includes(w));
    score += (commonWords.length / Math.max(productWords.length, codeWords.length)) * 0.4;

    // Sector alignment
    const sectorKeywords: Record<string, string[]> = {
      maternity: ['pregnancy', 'prenatal', 'obstetric', 'delivery', 'antenatal'],
      gynecology: ['gynecology', 'gynecologic', 'cervical', 'vaginal', 'uterine'],
      mental: ['psychiatric', 'psychology', 'therapy', 'counseling', 'behavioral'],
      diagnostic: ['ultrasound', 'imaging', 'diagnostic', 'screening', 'test']
    };

    for (const [key, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(k => productText.includes(k)) && keywords.some(k => codeDesc.includes(k))) {
        score += 0.3;
        break;
      }
    }

    // Code activity status
    if (cptCode.status === 'active') {
      score += 0.2;
    }

    // RVU value (higher RVU = more significant procedure)
    if (cptCode.totalRVU > 10) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Deduplicate matches by code
   */
  private deduplicateMatches(matches: MatchedCode[]): MatchedCode[] {
    const seen = new Map<string, MatchedCode>();
    
    for (const match of matches) {
      const existing = seen.get(match.code);
      if (!existing || match.matchConfidence > existing.matchConfidence) {
        if (existing) {
          match.frequency += existing.frequency;
        }
        seen.set(match.code, match);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Get sector reimbursement benchmark
   */
  getSectorBenchmark(sector: string): typeof SECTOR_REIMBURSEMENT_PATTERNS[string] | undefined {
    return SECTOR_REIMBURSEMENT_PATTERNS[sector.toLowerCase().replace(/\s+/g, '_')];
  }

  /**
   * Calculate reimbursement status for a company
   */
  calculateReimbursementStatus(matchedCodes: MatchedCode[]): ReimbursementStatus {
    const activeCodes = matchedCodes.filter(m => m.matchConfidence > 0.5);
    
    if (activeCodes.length === 0) {
      return {
        hasCPTCode: false,
        codeType: 'none',
        codeCount: 0,
        reimbursementBreadth: 'none',
        rateCategory: 'none',
        estimatedAnnualReimbursement: 0
      };
    }

    // Determine code type
    const hasHighValueCodes = activeCodes.some(c => c.medicareRate > 500);
    const codeType: ReimbursementStatus['codeType'] = 
      activeCodes.length > 2 ? 'established' : 
      hasHighValueCodes ? 'established' : 'new';

    // Calculate estimated annual reimbursement
    const totalRate = activeCodes.reduce((sum, c) => sum + c.medicareRate, 0);
    // 🔴 ILLUSTRATIVE: flat per-code usage assumption (see DEFAULT_ANNUAL_USES_PER_CODE)
    const estimatedAnnual = totalRate * DEFAULT_ANNUAL_USES_PER_CODE;

    // Determine rate category
    const avgRate = totalRate / activeCodes.length;
    const rateCategory: ReimbursementStatus['rateCategory'] =
      avgRate > 1000 ? 'high' :
      avgRate > 200 ? 'medium' : 'low';

    return {
      hasCPTCode: true,
      codeType,
      codeCount: activeCodes.length,
      reimbursementBreadth: activeCodes.length > 1 ? 'multi-payer' : 'medicare-only',
      rateCategory,
      estimatedAnnualReimbursement: estimatedAnnual
    };
  }

  /**
   * Calculate valuation impact based on reimbursement status
   */
  calculateValuationImpact(status: ReimbursementStatus): ValuationImpact {
    let multiple = 1.5; // Base consumer-only multiple
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (status.hasCPTCode) {
      if (status.codeType === 'established' && status.rateCategory === 'high') {
        multiple = 5.2;
        confidence = 'high';
      } else if (status.rateCategory === 'medium') {
        multiple = 2.8;
        confidence = 'medium';
      } else {
        multiple = 2.0;
        confidence = 'medium';
      }
    }

    return {
      reimbursementMultiple: multiple,
      benchmarkMultiple: multiple,
      premiumFactor: multiple / 1.5,
      confidence,
      comparableAnalysis: this.getComparables(multiple)
    };
  }

  /**
   * Returns a small set of public-comparable healthcare companies.
   *
   * 🔴 ILLUSTRATIVE: `valuationMultiple` values here are press-snapshot
   * estimates at the time of acquisition (or last public valuation event).
   * They do not reflect current market multiples. Refresh before external
   * use; consider sourcing from CB Insights, PitchBook, or SEC filings.
   */
  private getComparables(targetMultiple: number): ComparableCompany[] {
    const comparables: ComparableCompany[] = [
      { name: 'Teladoc Health', sector: 'telehealth', reimbursementStatus: 'reimbursement-rich', valuationMultiple: 8.5 },
      { name: 'Livongo (acquired)', sector: 'chronic care', reimbursementStatus: 'reimbursement-rich', valuationMultiple: 13.8, acquisitionPrice: 18500000000 },
      { name: 'Ro Health', sector: 'telehealth', reimbursementStatus: 'moderate', valuationMultiple: 3.2 },
      { name: 'Modern Fertility (acquired)', sector: 'fertility', reimbursementStatus: 'limited', valuationMultiple: 2.5, acquisitionPrice: 225000000 },
      { name: 'Natural Cycles', sector: 'fertility', reimbursementStatus: 'limited', valuationMultiple: 1.8 },
      { name: 'Tia', sector: 'womens health', reimbursementStatus: 'moderate', valuationMultiple: 3.0 },
      { name: 'Parsley Health', sector: 'functional medicine', reimbursementStatus: 'hybrid', valuationMultiple: 2.2 },
      { name: 'Flo', sector: 'fertility', reimbursementStatus: 'consumer-only', valuationMultiple: 1.4 }
    ];

    // Sort by closest multiple
    return comparables.sort((a, b) => 
      Math.abs(a.valuationMultiple - targetMultiple) - Math.abs(b.valuationMultiple - targetMultiple)
    ).slice(0, 4);
  }
}

// Export singleton instance
export const cmsConnector = new CMSReimbursementConnector();

// Helper function to initialize connector
export async function initializeCMSConnector(): Promise<CMSReimbursementConnector> {
  const connector = new CMSReimbursementConnector();
  await connector.initialize();
  return connector;
}

export default cmsConnector;
