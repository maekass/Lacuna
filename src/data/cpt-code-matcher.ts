/**
 * CPT Code Matcher
 * 
 * Advanced fuzzy matching algorithms to connect company products
 * to relevant CPT/HCPCS codes with confidence scoring.
 */

import { CPTCode, MatchedCode, cmsConnector } from './cms-reimbursement-connector';

// Levenshtein distance for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[str1.length][str2.length];
}

// Calculate similarity score (0-1)
function similarityScore(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

// Medical terminology thesaurus for synonym matching
const MEDICAL_THESAURUS: Record<string, string[]> = {
  'pregnancy': ['prenatal', 'antenatal', 'maternity', 'gestation', 'expecting'],
  'delivery': ['birth', 'labor', 'childbirth', 'parturition'],
  'fertility': ['conception', 'reproduction', 'infertility', 'ivf', 'insemination'],
  'gynecology': ['gyn', 'pelvic', 'cervical', 'vaginal', 'uterine', 'ovarian'],
  'screening': ['test', 'detection', 'early detection', 'preventive', 'check'],
  'monitoring': ['tracking', 'surveillance', 'observation', 'watching'],
  'therapy': ['treatment', 'intervention', 'care', 'management'],
  'imaging': ['ultrasound', 'scan', 'radiology', 'diagnostic imaging'],
  'procedure': ['surgery', 'operation', 'intervention', 'technique'],
  'diagnostic': ['testing', 'evaluation', 'assessment', 'workup'],
  'telehealth': ['telemedicine', 'virtual care', 'remote', 'digital health'],
  'wearable': ['device', 'sensor', 'monitor', 'tracker', 'smart']
};

// Expand search terms with synonyms
function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set(terms);
  
  for (const term of terms) {
    const normalizedTerm = term.toLowerCase();
    
    if (MEDICAL_THESAURUS[normalizedTerm]) {
      MEDICAL_THESAURUS[normalizedTerm].forEach(syn => expanded.add(syn));
    }
    
    for (const [key, synonyms] of Object.entries(MEDICAL_THESAURUS)) {
      if (synonyms.includes(normalizedTerm)) {
        expanded.add(key);
        synonyms.forEach(syn => expanded.add(syn));
      }
    }
  }
  
  return Array.from(expanded);
}

export interface MatchOptions {
  threshold?: number;
  maxResults?: number;
  includeSynonyms?: boolean;
}

export interface MatchResult {
  code: string;
  description: string;
  confidence: number;
  matchDetails: {
    exactMatches: string[];
    synonymMatches: string[];
    similarity: number;
  };
  medicareRate: number;
  category: string;
}

export class CPTCodeMatcher {
  private connector = cmsConnector;

  async fuzzyMatch(
    productName: string,
    productDescription: string,
    sector: string,
    options: MatchOptions = {}
  ): Promise<MatchResult[]> {
    const {
      threshold = 0.3,
      maxResults = 10,
      includeSynonyms = true
    } = options;

    let searchTerms = this.extractSearchTerms(productName, productDescription, sector);
    
    if (includeSynonyms) {
      searchTerms = expandWithSynonyms(searchTerms);
    }

    await this.connector.initialize();
    const allCodes = this.connector.searchCPTCodes(''); // Get all codes

    const scoredCodes: MatchResult[] = [];

    for (const code of allCodes) {
      const result = this.calculateMatch(searchTerms, code, sector);

      if (result.confidence >= threshold) {
        scoredCodes.push(result);
      }
    }

    return scoredCodes
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  private extractSearchTerms(name: string, description: string, sector: string): string[] {
    const terms = new Set<string>();

    const nameWords = name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    nameWords.forEach(w => terms.add(w));

    if (description) {
      const descWords = description
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);
      descWords.forEach(w => terms.add(w));
    }

    const sectorKeywords = this.getSectorKeywords(sector);
    sectorKeywords.forEach(k => terms.add(k));

    return Array.from(terms);
  }

  private getSectorKeywords(sector: string): string[] {
    const keywords: Record<string, string[]> = {
      fertility: ['fertility', 'infertility', 'ivf', 'insemination', 'conception'],
      maternal_health: ['pregnancy', 'prenatal', 'maternity', 'obstetric', 'delivery'],
      mental_health: ['mental', 'psychiatric', 'therapy', 'counseling', 'behavioral'],
      gynecology: ['gynecology', 'pelvic', 'cervical', 'vaginal', 'uterine'],
      pelvic_health: ['pelvic', 'incontinence', 'floor', 'bladder'],
      menopause: ['menopause', 'hormone', 'estrogen', 'hot flash'],
      contraception: ['contraception', 'birth control', 'family planning'],
      breast_health: ['breast', 'mammogram', 'cancer', 'screening'],
      wearable_monitoring: ['wearable', 'monitor', 'tracker', 'sensor'],
      digital_therapeutics: ['digital', 'therapeutic', 'app', 'program']
    };

    const normalizedSector = sector.toLowerCase().replace(/\s+/g, '_');
    return keywords[normalizedSector] || [];
  }

  private calculateMatch(searchTerms: string[], code: CPTCode, sector: string): MatchResult {
    const codeDesc = code.description.toLowerCase();
    
    let confidence = 0;
    const exactMatches: string[] = [];
    const synonymMatches: string[] = [];

    for (const term of searchTerms) {
      if (codeDesc.includes(term)) {
        exactMatches.push(term);
        confidence += 0.25;
      }
    }

    const expandedTerms = expandWithSynonyms(searchTerms);
    for (const term of expandedTerms) {
      if (!exactMatches.includes(term) && codeDesc.includes(term)) {
        synonymMatches.push(term);
        confidence += 0.15;
      }
    }

    let maxSimilarity = 0;
    for (const term of searchTerms) {
      const words = codeDesc.split(/\s+/);
      for (const word of words) {
        const sim = similarityScore(term, word);
        if (sim > maxSimilarity) maxSimilarity = sim;
      }
    }
    confidence += maxSimilarity * 0.2;

    if (code.status === 'active') confidence += 0.1;
    if (code.totalRVU > 10) confidence += 0.1;

    const category = this.categorizeProcedure(code.description);

    return {
      code: code.code,
      description: code.description,
      confidence: Math.min(confidence, 1.0),
      matchDetails: {
        exactMatches,
        synonymMatches,
        similarity: maxSimilarity
      },
      medicareRate: code.medicareRate,
      category
    };
  }

  private categorizeProcedure(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('ultrasound') || desc.includes('imaging') || desc.includes('radiology')) {
      return 'Diagnostic Imaging';
    }
    if (desc.includes('surgery') || desc.includes('procedure') || desc.includes('repair')) {
      return 'Surgical';
    }
    if (desc.includes('evaluation') || desc.includes('visit') || desc.includes('consultation')) {
      return 'Evaluation & Management';
    }
    if (desc.includes('laboratory') || desc.includes('test') || desc.includes('pathology')) {
      return 'Laboratory';
    }
    if (desc.includes('therapy') || desc.includes('treatment') || desc.includes('injection')) {
      return 'Medicine';
    }
    if (desc.includes('screening') || desc.includes('preventive')) {
      return 'Preventive';
    }
    
    return 'Other';
  }

  async findCodesByProductType(
    productType: string,
    maxResults: number = 5
  ): Promise<MatchResult[]> {
    await this.connector.initialize();
    
    const keywords = this.getKeywordsForProductType(productType);
    const results: MatchResult[] = [];

    for (const keyword of keywords) {
      const codes = this.connector.searchCPTCodes(keyword);
      
      for (const code of codes.slice(0, 3)) {
        results.push({
          code: code.code,
          description: code.description,
          confidence: 0.7,
          matchDetails: {
            exactMatches: [keyword],
            synonymMatches: [],
            similarity: 0.8
          },
          medicareRate: code.medicareRate,
          category: this.categorizeProcedure(code.description)
        });
      }
    }

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  private getKeywordsForProductType(productType: string): string[] {
    const typeMap: Record<string, string[]> = {
      'fertility_app': ['fertility', 'ovulation', 'conception'],
      'period_tracker': ['menstrual', 'cycle', 'ovulation'],
      'pregnancy_app': ['prenatal', 'pregnancy', 'maternity'],
      'mental_health': ['psychiatric', 'therapy', 'counseling'],
      'telehealth': ['telehealth', 'telemedicine', 'virtual'],
      'wearable': ['monitoring', 'physiological', 'remote'],
      'diagnostic': ['diagnostic', 'testing', 'screening']
    };

    return typeMap[productType.toLowerCase()] || [productType];
  }
}

export const cptMatcher = new CPTCodeMatcher();
export default cptMatcher;
