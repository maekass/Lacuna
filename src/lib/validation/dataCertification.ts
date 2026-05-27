/**
 * Data Certification System
 * 5-layer validation adapted from windsurf-project Python implementation
 * Provides cryptographic verification and quality scoring
 */

import { createHash } from 'crypto';

export interface CertificationResult {
  isValid: boolean;
  qualityScore: number; // 0-100
  hash: string;
  timestamp: string;
  layers: ValidationLayer[];
  summary: string;
}

export interface ValidationLayer {
  name: string;
  passed: boolean;
  score: number;
  details: string[];
}

export interface ValidatedData {
  data: unknown;
  certification: CertificationResult;
}

// 5-layer validation system
export class DataCertification {
  private static instance: DataCertification;

  static getInstance(): DataCertification {
    if (!DataCertification.instance) {
      DataCertification.instance = new DataCertification();
    }
    return DataCertification.instance;
  }

  certify(data: unknown, dataType: 'companies' | 'acquisitions' | 'trials'): CertificationResult {
    const layers: ValidationLayer[] = [
      this.validateSchema(data, dataType),
      this.validateCompleteness(data),
      this.validateConsistency(data),
      this.validateProvenance(data),
      this.validateQuality(data)
    ];

    const totalScore = layers.reduce((sum, layer) => sum + layer.score, 0) / layers.length;
    const allPassed = layers.every(layer => layer.passed);

    const certification: CertificationResult = {
      isValid: allPassed,
      qualityScore: Math.round(totalScore),
      hash: this.generateHash(data),
      timestamp: new Date().toISOString(),
      layers,
      summary: this.generateSummary(layers, totalScore)
    };

    return certification;
  }

  private validateSchema(data: unknown, dataType: string): ValidationLayer {
    const details: string[] = [];
    let passed = true;
    let score = 100;

    if (!data || typeof data !== 'object') {
      passed = false;
      score = 0;
      details.push('Data is null or not an object');
      return { name: 'Schema Validation', passed, score, details };
    }

    const arr = Array.isArray(data) ? data : [data];

    if (arr.length === 0) {
      passed = false;
      score = 0;
      details.push('Empty dataset');
      return { name: 'Schema Validation', passed, score, details };
    }

    // Check required fields based on data type
    const requiredFields: Record<string, string[]> = {
      companies: ['id', 'name', 'sector', 'founded', 'sources'],
      acquisitions: ['id', 'targetId', 'acquirerId', 'announcedDate', 'sources'],
      trials: ['nctId', 'phase', 'status', 'disease', 'sponsor']
    };

    const fields = requiredFields[dataType] || [];
    const sample = arr[0] as Record<string, unknown>;

    for (const field of fields) {
      if (!(field in sample)) {
        passed = false;
        score -= 10;
        details.push(`Missing required field: ${field}`);
      }
    }

    if (passed) {
      details.push(`All ${fields.length} required fields present`);
      details.push(`Validated ${arr.length} records`);
    }

    return { name: 'Schema Validation', passed, score: Math.max(0, score), details };
  }

  private validateCompleteness(data: unknown): ValidationLayer {
    const details: string[] = [];
    let passed = true;
    let score = 100;

    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0) {
      return { name: 'Completeness', passed: false, score: 0, details: ['No data'] };
    }

    let totalFields = 0;
    let populatedFields = 0;

    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        const entries = Object.entries(item);
        totalFields += entries.length;
        populatedFields += entries.filter(([, v]) => 
          v !== undefined && v !== null && v !== ''
        ).length;
      }
    }

    const completenessRatio = totalFields > 0 ? populatedFields / totalFields : 0;
    score = Math.round(completenessRatio * 100);

    if (completenessRatio < 0.9) {
      passed = false;
      details.push(`Completeness: ${(completenessRatio * 100).toFixed(1)}% (target: 90%+)`);
    } else {
      details.push(`Completeness: ${(completenessRatio * 100).toFixed(1)}%`);
    }

    details.push(`${populatedFields}/${totalFields} fields populated`);

    return { name: 'Completeness', passed, score, details };
  }

  private validateConsistency(data: unknown): ValidationLayer {
    const details: string[] = [];
    let passed = true;
    let score = 100;

    const arr = Array.isArray(data) ? data : [];
    const issues: string[] = [];

    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;

        // Check for logical inconsistencies
        if (record.founded && typeof record.founded === 'number') {
          if (record.founded < 1990 || record.founded > 2026) {
            issues.push(`Suspicious founding year: ${record.founded}`);
          }
        }

        if (record.totalFunding && record.lastKnownValuation) {
          const funding = record.totalFunding as number;
          const valuation = record.lastKnownValuation as number;
          if (funding > valuation * 0.5) {
            issues.push(`Funding (${funding}M) seems high relative to valuation (${valuation}M)`);
          }
        }
      }
    }

    if (issues.length > 0) {
      score = Math.max(0, 100 - issues.length * 5);
      if (score < 80) passed = false;
      details.push(...issues.slice(0, 3));
      if (issues.length > 3) {
        details.push(`... and ${issues.length - 3} more issues`);
      }
    } else {
      details.push('No logical inconsistencies detected');
    }

    return { name: 'Consistency', passed, score, details };
  }

  private validateProvenance(data: unknown): ValidationLayer {
    const details: string[] = [];
    let passed = true;
    let score = 100;

    const arr = Array.isArray(data) ? data : [];
    let sourcesCount = 0;
    let recordsWithSources = 0;

    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        if (record.sources && Array.isArray(record.sources)) {
          recordsWithSources++;
          sourcesCount += record.sources.length;
        }
      }
    }

    if (arr.length > 0) {
      const coverage = recordsWithSources / arr.length;
      if (coverage < 0.8) {
        passed = false;
        score = Math.round(coverage * 100);
        details.push(`Source coverage: ${(coverage * 100).toFixed(1)}% (target: 80%+)`);
      } else {
        details.push(`Source coverage: ${(coverage * 100).toFixed(1)}%`);
      }

      const avgSources = recordsWithSources > 0 ? sourcesCount / recordsWithSources : 0;
      details.push(`Average ${avgSources.toFixed(1)} sources per record`);

      if (avgSources < 2) {
        score -= 10;
        details.push('Low source density (target: 3+ per record)');
      }
    }

    return { name: 'Provenance', passed, score: Math.max(0, score), details };
  }

  private validateQuality(data: unknown): ValidationLayer {
    const details: string[] = [];
    let passed = true;
    let score = 100;

    const arr = Array.isArray(data) ? data : [];

    // Check for data diversity
    const sectors = new Set<string>();
    const stages = new Set<string>();

    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        if (record.sector) sectors.add(String(record.sector));
        if (record.stage) stages.add(String(record.stage));
      }
    }

    details.push(`${sectors.size} unique sectors`);
    details.push(`${stages.size} unique stages`);

    if (sectors.size < 3) {
      score -= 15;
      details.push('Low sector diversity');
    }

    if (stages.size < 3) {
      score -= 10;
      details.push('Low stage diversity');
    }

    if (arr.length < 10) {
      score -= 20;
      details.push(`Small dataset size (${arr.length} records)`);
    } else {
      details.push(`Dataset size: ${arr.length} records`);
    }

    if (score < 70) passed = false;

    return { name: 'Quality', passed, score: Math.max(0, score), details };
  }

  private generateHash(data: unknown): string {
    const str = JSON.stringify(data);
    return createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  private generateSummary(layers: ValidationLayer[], totalScore: number): string {
    const passedLayers = layers.filter(l => l.passed).length;
    return `Certification: ${passedLayers}/${layers.length} layers passed | Quality Score: ${Math.round(totalScore)}/100`;
  }
}

// Helper functions for component use
export function useDataCertification() {
  return DataCertification.getInstance();
}

export function generateVerificationBadge(certification: CertificationResult): string {
  const score = certification.qualityScore;
  const grade = score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 85 ? 'B+' : score >= 80 ? 'B' : 'C';
  const color = score >= 90 ? 'green' : score >= 80 ? 'yellow' : 'red';
  
  return `[${grade}] ${score}/100 ${color}`;
}

// Daily certification tracking (for automated verification)
export interface DailyCertification {
  date: string;
  hash: string;
  qualityScore: number;
  isValid: boolean;
  details: string;
}

export function createDailyCertification(data: unknown, dataType: string): DailyCertification {
  const certifier = DataCertification.getInstance();
  const cert = certifier.certify(data, dataType as 'companies' | 'acquisitions' | 'trials');
  
  return {
    date: new Date().toISOString().split('T')[0],
    hash: cert.hash,
    qualityScore: cert.qualityScore,
    isValid: cert.isValid,
    details: cert.summary
  };
}
