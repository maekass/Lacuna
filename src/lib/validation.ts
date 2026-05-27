import { Company, Acquisition, ValidationResult, Sector, Stage, DealType } from './types';

// Validation functions for strict data integrity
export const Validation = {
  // Company validation
  company(data: unknown): ValidationResult<Company> {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Invalid company data structure'] };
    }
    
    const c = data as Record<string, unknown>;
    
    // Required fields
    if (!c.id || typeof c.id !== 'string') errors.push('Missing or invalid id');
    if (!c.name || typeof c.name !== 'string') errors.push('Missing or invalid name');
    if (!c.sector || !isValidSector(c.sector)) errors.push(`Invalid sector: ${c.sector}`);
    if (!c.stage || !isValidStage(c.stage)) errors.push(`Invalid stage: ${c.stage}`);
    if (!c.founded || typeof c.founded !== 'number' || c.founded < 1800 || c.founded > 2100) {
      errors.push(`Invalid founded year: ${c.founded}`);
    }
    if (!c.employees || typeof c.employees !== 'number' || c.employees < 0) {
      errors.push(`Invalid employee count: ${c.employees}`);
    }
    if (!c.hq || typeof c.hq !== 'string') errors.push('Missing or invalid hq');
    if (!c.description || typeof c.description !== 'string') errors.push('Missing or invalid description');
    
    // Optional validation
    if (c.valuation !== undefined) {
      if (typeof c.valuation !== 'number' || c.valuation < 0) {
        errors.push(`Invalid valuation: ${c.valuation}`);
      }
    }
    
    return errors.length === 0 
      ? { isValid: true, data: c as unknown as Company, errors: [] }
      : { isValid: false, errors };
  },
  
  // Acquisition validation
  acquisition(data: unknown): ValidationResult<Acquisition> {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Invalid acquisition data structure'] };
    }
    
    const a = data as Record<string, unknown>;
    
    if (!a.id || typeof a.id !== 'string') errors.push('Missing or invalid id');
    if (!a.targetId || typeof a.targetId !== 'string') errors.push('Missing or invalid targetId');
    if (!a.acquirerId || typeof a.acquirerId !== 'string') errors.push('Missing or invalid acquirerId');
    if (!a.announcedDate || !isValidDate(a.announcedDate)) errors.push('Invalid announcedDate');
    if (!a.dealType || !isValidDealType(a.dealType)) errors.push(`Invalid dealType: ${a.dealType}`);
    if (!a.strategicRationale || typeof a.strategicRationale !== 'string') {
      errors.push('Missing or invalid strategicRationale');
    }
    
    // Optional date validation
    if (a.closedDate !== undefined && !isValidDate(a.closedDate)) {
      errors.push('Invalid closedDate');
    }
    
    // Value validation
    if (a.dealValue !== undefined) {
      if (typeof a.dealValue !== 'number' || a.dealValue < 0) {
        errors.push(`Invalid dealValue: ${a.dealValue}`);
      }
    }
    
    return errors.length === 0 
      ? { isValid: true, data: a as unknown as Acquisition, errors: [] }
      : { isValid: false, errors };
  },
  
  // Batch validation
  companies(data: unknown[]): ValidationResult<Company[]> {
    const valid: Company[] = [];
    const allErrors: string[] = [];
    
    data.forEach((item, index) => {
      const result = this.company(item);
      if (result.isValid && result.data) {
        valid.push(result.data);
      } else {
        allErrors.push(`[${index}]: ${result.errors.join(', ')}`);
      }
    });
    
    return allErrors.length === 0
      ? { isValid: true, data: valid, errors: [] }
      : { isValid: false, errors: allErrors };
  }
};

// Type guards
const validSectors: readonly Sector[] = [
  'Fertility', 'Mental Health', 'Cardiovascular', 'Oncology', 
  'Menopause', 'Pelvic Health', 'General Wellness', 'Wearables', 'Sexual Wellness'
];

const validStages: readonly Stage[] = [
  'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series F',
  'Late Stage', 'Pre-IPO', 'Public'
];

const validDealTypes: readonly DealType[] = [
  'Acquisition', 'Merger', 'Strategic Investment', 'Asset Purchase'
];

function isValidSector(value: unknown): value is Sector {
  return typeof value === 'string' && validSectors.includes(value as Sector);
}

function isValidStage(value: unknown): value is Stage {
  return typeof value === 'string' && validStages.includes(value as Stage);
}

function isValidDealType(value: unknown): value is DealType {
  return typeof value === 'string' && validDealTypes.includes(value as DealType);
}

function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}
