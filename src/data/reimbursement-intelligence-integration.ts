/**
 * Reimbursement Intelligence Integration
 * 
 * Integrates CMS reimbursement data with Lacuna's company database
 * to provide comprehensive reimbursement and valuation analysis.
 */

import { 
  CMSReimbursementConnector, 
  CompanyReimbursementProfile,
  ReimbursementStatus,
  BusinessModel,
  SECTOR_REIMBURSEMENT_PATTERNS
} from './cms-reimbursement-connector';
import { CPTCodeMatcher } from './cpt-code-matcher';
import { ValuationPremiumCalculator } from './valuation-premium-calculator';

// Lacuna company type (from existing dataset)
interface LacunaCompany {
  id: string;
  name: string;
  productDescription: string;
  sector: string;
  subSector?: string;
  funding?: number;
  revenue?: number;
}

export interface ReimbursementAnalysisResult {
  company: LacunaCompany;
  profile: CompanyReimbursementProfile;
  classification: {
    reimbursementStatus: ReimbursementStatus;
    businessModel: BusinessModel;
    estimatedInsuranceRevenue: number;
  };
  valuation: {
    baseMultiple: number;
    adjustedMultiple: number;
    impliedValuation: number;
    valuationRange: { low: number; high: number };
    reimbursementPremium: number;
    confidence: 'high' | 'medium' | 'low';
  };
  sectorBenchmark: {
    avgReimbursementCoverage: number;
    sectorReimbursementLevel: 'high' | 'medium' | 'low';
    comparison: string;
  };
  acquirerAnalysis: {
    healthcareFit: { score: number; premium: number };
    techFit: { score: number; premium: number };
    pharmaFit: { score: number; premium: number };
    recommended: 'healthcare' | 'tech' | 'pharma' | 'retail';
  };
  insights: string[];
}

export class ReimbursementIntelligenceIntegration {
  private connector: CMSReimbursementConnector;
  private matcher: CPTCodeMatcher;
  private calculator: ValuationPremiumCalculator;

  constructor() {
    this.connector = new CMSReimbursementConnector();
    this.matcher = new CPTCodeMatcher();
    this.calculator = new ValuationPremiumCalculator();
  }

  async initialize(): Promise<void> {
    await this.connector.initialize();
  }

  /**
   * Analyze a Lacuna company for reimbursement intelligence
   */
  analyzeCompany(company: LacunaCompany): ReimbursementAnalysisResult {
    // Match company product to CPT codes
    const matchedCodes = this.connector.matchProductToCodes(
      company.name,
      company.productDescription,
      company.sector
    );

    // Calculate reimbursement status
    const reimbursementStatus = this.connector.calculateReimbursementStatus(matchedCodes);

    // Determine business model
    const businessModel = this.classifyBusinessModel(reimbursementStatus);

    // Estimate insurance revenue
    const estimatedInsuranceRevenue = company.revenue 
      ? company.revenue * (businessModel === 'insurance-driven' ? 0.75 : 
                          businessModel === 'hybrid' ? 0.45 : 0.05)
      : 0;

    // Build company profile
    const profile: CompanyReimbursementProfile = {
      companyName: company.name,
      productName: company.name,
      sector: company.sector,
      matchedCodes,
      reimbursementStatus,
      businessModel,
      estimatedReimbursementPercentage: businessModel === 'insurance-driven' ? 75 : 
                                       businessModel === 'hybrid' ? 45 : 5,
      valuationImpact: this.connector.calculateValuationImpact(reimbursementStatus)
    };

    // Calculate valuation
    const valuation = this.calculator.calculateValuation({
      annualRevenue: company.revenue || 5000000,
      reimbursementStatus,
      sector: company.sector,
      growthRate: 35,
      profitability: 'break-even',
      acquirerType: 'healthcare'
    });

    // Get sector benchmark
    const sectorKey = company.sector.toLowerCase().replace(/\s+/g, '_');
    const sectorPattern = SECTOR_REIMBURSEMENT_PATTERNS[sectorKey];

    // Analyze acquirer fit
    const acquirerAnalysis = this.analyzeAcquirerFit(profile);

    // Generate insights
    const insights = this.generateInsights(profile, valuation, sectorPattern);

    return {
      company,
      profile,
      classification: {
        reimbursementStatus,
        businessModel,
        estimatedInsuranceRevenue
      },
      valuation: {
        baseMultiple: valuation.baseMultiple,
        adjustedMultiple: valuation.adjustedMultiple,
        impliedValuation: valuation.impliedValuation,
        valuationRange: { low: valuation.rangeLow, high: valuation.rangeHigh },
        reimbursementPremium: valuation.reimbursementPremium,
        confidence: valuation.confidence
      },
      sectorBenchmark: {
        avgReimbursementCoverage: sectorPattern?.avgCoverage || 40,
        sectorReimbursementLevel: sectorPattern?.reimbursementLevel || 'medium',
        comparison: this.compareToSector(profile, sectorPattern)
      },
      acquirerAnalysis,
      insights
    };
  }

  /**
   * Classify business model based on reimbursement status
   */
  private classifyBusinessModel(status: ReimbursementStatus): BusinessModel {
    if (!status.hasCPTCode) {
      return 'b2c-consumer';
    }

    if (status.codeType === 'established' && status.rateCategory === 'high') {
      return 'insurance-driven';
    }

    if (status.codeCount > 0) {
      return 'hybrid';
    }

    return 'unclear';
  }

  /**
   * Compare company to sector benchmark
   */
  private compareToSector(
    profile: CompanyReimbursementProfile,
    sectorPattern?: typeof SECTOR_REIMBURSEMENT_PATTERNS[string]
  ): string {
    if (!sectorPattern) {
      return 'Sector benchmark not available';
    }

    const companyReimbursement = profile.estimatedReimbursementPercentage;
    const sectorAvg = sectorPattern.avgCoverage;

    if (companyReimbursement > sectorAvg + 20) {
      return `Above sector average (${companyReimbursement}% vs ${sectorAvg}% avg)`;
    } else if (companyReimbursement < sectorAvg - 20) {
      return `Below sector average (${companyReimbursement}% vs ${sectorAvg}% avg)`;
    } else {
      return `In line with sector average (${companyReimbursement}% vs ${sectorAvg}% avg)`;
    }
  }

  /**
   * Analyze fit with different acquirer types
   */
  private analyzeAcquirerFit(profile: CompanyReimbursementProfile): ReimbursementAnalysisResult['acquirerAnalysis'] {
    const healthcareFit = this.calculator.analyzeAcquirerFit(profile, {
      type: 'healthcare',
      name: 'Healthcare',
      reimbursementCapability: 'strong',
      typicalPremium: 1.35
    });

    const techFit = this.calculator.analyzeAcquirerFit(profile, {
      type: 'tech',
      name: 'Tech',
      reimbursementCapability: 'weak',
      typicalPremium: 0.95
    });

    const pharmaFit = this.calculator.analyzeAcquirerFit(profile, {
      type: 'pharma',
      name: 'Pharma',
      reimbursementCapability: 'moderate',
      typicalPremium: 1.25
    });

    // Determine recommended acquirer
    let recommended: 'healthcare' | 'tech' | 'pharma' | 'retail' = 'healthcare';
    let highestFit = healthcareFit.fitScore;

    if (techFit.fitScore > highestFit) {
      recommended = 'tech';
      highestFit = techFit.fitScore;
    }
    if (pharmaFit.fitScore > highestFit) {
      recommended = 'pharma';
    }

    return {
      healthcareFit: { score: healthcareFit.fitScore, premium: healthcareFit.recommendedPremium },
      techFit: { score: techFit.fitScore, premium: techFit.recommendedPremium },
      pharmaFit: { score: pharmaFit.fitScore, premium: pharmaFit.recommendedPremium },
      recommended
    };
  }

  /**
   * Generate strategic insights
   */
  private generateInsights(
    profile: CompanyReimbursementProfile,
    valuation: ReturnType<ValuationPremiumCalculator['calculateValuation']>,
    sectorPattern?: typeof SECTOR_REIMBURSEMENT_PATTERNS[string]
  ): string[] {
    const insights: string[] = [];

    if (profile.reimbursementStatus.hasCPTCode) {
      if (profile.reimbursementStatus.codeType === 'established') {
        insights.push(`Established CPT codes provide predictable reimbursement revenue stream`);
      } else {
        insights.push(`New CPT codes may require payer education and coverage determination`);
      }

      if (profile.reimbursementStatus.reimbursementBreadth === 'multi-payer') {
        insights.push(`Multi-payer coverage reduces revenue concentration risk`);
      }

      if (profile.reimbursementStatus.rateCategory === 'high') {
        insights.push(`High RVU procedures command premium valuation multiples`);
      }
    } else {
      insights.push(`Consumer-only model limits revenue predictability; consider reimbursement strategy`);
    }

    if (sectorPattern) {
      const companyReimbursement = profile.estimatedReimbursementPercentage;
      if (companyReimbursement < sectorPattern.avgCoverage - 20) {
        insights.push(`Opportunity to increase reimbursement coverage vs. sector peers`);
      }
    }

    if (valuation.reimbursementPremium > 1.4) {
      insights.push(`Strong reimbursement profile commands ${((valuation.reimbursementPremium - 1) * 100).toFixed(0)}% valuation premium`);
    }

    return insights;
  }

  /**
   * Batch analyze multiple companies
   */
  analyzeCompanies(companies: LacunaCompany[]): ReimbursementAnalysisResult[] {
    const results: ReimbursementAnalysisResult[] = [];
    
    for (const company of companies) {
      try {
        const result = this.analyzeCompany(company);
        results.push(result);
      } catch (error) {
        console.error(`Error analyzing ${company.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Get summary statistics for a set of analyses
   */
  getSummaryStatistics(analyses: ReimbursementAnalysisResult[]): {
    totalCompanies: number;
    insuranceDriven: number;
    hybrid: number;
    consumerOnly: number;
    avgValuationMultiple: number;
    reimbursementPremiumRange: { min: number; max: number };
    sectorDistribution: Record<string, number>;
  } {
    const businessModels = {
      insuranceDriven: analyses.filter(a => a.classification.businessModel === 'insurance-driven').length,
      hybrid: analyses.filter(a => a.classification.businessModel === 'hybrid').length,
      consumerOnly: analyses.filter(a => a.classification.businessModel === 'b2c-consumer').length
    };

    const avgMultiple = analyses.reduce((sum, a) => sum + a.valuation.adjustedMultiple, 0) / analyses.length;

    const premiums = analyses.map(a => a.valuation.reimbursementPremium);

    const sectorDist: Record<string, number> = {};
    analyses.forEach(a => {
      sectorDist[a.company.sector] = (sectorDist[a.company.sector] || 0) + 1;
    });

    return {
      totalCompanies: analyses.length,
      ...businessModels,
      avgValuationMultiple: avgMultiple,
      reimbursementPremiumRange: {
        min: Math.min(...premiums),
        max: Math.max(...premiums)
      },
      sectorDistribution: sectorDist
    };
  }
}

// Export singleton instance
export const reimbursementIntelligence = new ReimbursementIntelligenceIntegration();
export default reimbursementIntelligence;
