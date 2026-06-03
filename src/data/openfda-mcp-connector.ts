/**
 * openFDA MCP Connector
 * 
 * Queries openFDA API for device and drug approvals
 * to assess FDA regulatory maturity.
 * 
 * API: https://api.fda.gov/
 * Docs: https://open.fda.gov/apis/
 */

export type DeviceClearanceType = '510k' | 'DENovo' | 'PMA' | 'HDE' | 'None';
export type DrugApprovalType = 'NDA' | 'ANDA' | 'BLA' | 'OTC' | 'None';
export type ProductClass = 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'UNCLASSIFIED';

export interface FDAProduct {
  productId: string;
  productName: string;
  companyName: string;
  type: 'device' | 'drug';
  clearanceType: DeviceClearanceType | DrugApprovalType;
  approvalDate: string;
  productClass?: ProductClass;
  indications: string[];
  devicePanel?: string;
  drugActiveIngredient?: string;
  reviewTimeDays?: number;
  hasPostMarketStudies?: boolean;
}

export interface CompanyFDAProfile {
  companyId: string;
  companyName: string;
  products: FDAProduct[];
  totalProducts: number;
  deviceCount: number;
  drugCount: number;
  has510k: boolean;
  hasDeNovo: boolean;
  hasPMA: boolean;
  hasNDA: boolean;
  earliestApprovalDate?: string;
  latestApprovalDate?: string;
  fdaMaturityScore: number;
  productClasses: ProductClass[];
}

// FDA clearance scoring
export const FDA_CLEARANCE_SCORES: Record<string, number> = {
  'None': 0,
  '510k': 50,
  'DENovo': 70,
  'PMA': 100,
  'HDE': 90,
  'NDA': 100,
  'ANDA': 70,
  'BLA': 100,
  'OTC': 60
};

export const PRODUCT_CLASS_SCORES: Record<ProductClass, number> = {
  'CLASS_I': 30,
  'CLASS_II': 60,
  'CLASS_III': 100,
  'UNCLASSIFIED': 40
};

const WOMENS_HEALTH_INDICATIONS = [
  'contraception', 'fertility', 'pregnancy', 'maternal', 'gynecology',
  'menopause', 'breast', 'ovarian', 'cervical', 'uterine', 'pelvic',
  'menstrual', 'obstetric', 'prenatal', 'postpartum'
];

export class OpenFDAClient {
  private baseUrl = 'https://api.fda.gov';

  /**
   * Search for medical devices by company name
   */
  async searchDevices(companyName: string, limit: number = 100): Promise<FDAProduct[]> {
    const query = this.buildCompanyQuery(companyName);
    const url = `${this.baseUrl}/device/510k.json?search=${encodeURIComponent(query)}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`openFDA device API error: ${response.status}`);
      }
      const data = await response.json();
      return this.parseDevices(data.results || []);
    } catch (error) {
      console.error('openFDA device search error:', error);
      return [];
    }
  }

  /**
   * Search for PMA (Pre-Market Approval) devices
   */
  async searchPMA(companyName: string, limit: number = 100): Promise<FDAProduct[]> {
    const query = this.buildCompanyQuery(companyName);
    const url = `${this.baseUrl}/device/pma.json?search=${encodeURIComponent(query)}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`openFDA PMA API error: ${response.status}`);
      }
      const data = await response.json();
      return this.parsePMA(data.results || []);
    } catch (error) {
      console.error('openFDA PMA search error:', error);
      return [];
    }
  }

  /**
   * Search for De Novo devices
   */
  async searchDeNovo(companyName: string, limit: number = 100): Promise<FDAProduct[]> {
    const query = this.buildCompanyQuery(companyName);
    const url = `${this.baseUrl}/device/denovo.json?search=${encodeURIComponent(query)}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`openFDA De Novo API error: ${response.status}`);
      }
      const data = await response.json();
      return this.parseDeNovo(data.results || []);
    } catch (error) {
      console.error('openFDA De Novo search error:', error);
      return [];
    }
  }

  /**
   * Search for drug approvals
   */
  async searchDrugs(companyName: string, limit: number = 100): Promise<FDAProduct[]> {
    const query = this.buildCompanyQuery(companyName);
    const url = `${this.baseUrl}/drug/drugsfda.json?search=${encodeURIComponent(query)}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`openFDA drug API error: ${response.status}`);
      }
      const data = await response.json();
      return this.parseDrugs(data.results || []);
    } catch (error) {
      console.error('openFDA drug search error:', error);
      return [];
    }
  }

  /**
   * Get complete FDA profile for a company
   */
  async getCompanyProfile(companyId: string, companyName: string): Promise<CompanyFDAProfile> {
    const [devices, pmaDevices, deNovoDevices, drugs] = await Promise.all([
      this.searchDevices(companyName),
      this.searchPMA(companyName),
      this.searchDeNovo(companyName),
      this.searchDrugs(companyName)
    ]);

    const allProducts = [...devices, ...pmaDevices, ...deNovoDevices, ...drugs];

    // Remove duplicates by product ID
    const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.productId, p])).values());

    const profile: CompanyFDAProfile = {
      companyId,
      companyName,
      products: uniqueProducts,
      totalProducts: uniqueProducts.length,
      deviceCount: uniqueProducts.filter(p => p.type === 'device').length,
      drugCount: uniqueProducts.filter(p => p.type === 'drug').length,
      has510k: uniqueProducts.some(p => p.clearanceType === '510k'),
      hasDeNovo: uniqueProducts.some(p => p.clearanceType === 'DENovo'),
      hasPMA: uniqueProducts.some(p => p.clearanceType === 'PMA'),
      hasNDA: uniqueProducts.some(p => p.clearanceType === 'NDA'),
      earliestApprovalDate: this.getEarliestDate(uniqueProducts),
      latestApprovalDate: this.getLatestDate(uniqueProducts),
      fdaMaturityScore: 0,
      productClasses: Array.from(
        new Set(
          uniqueProducts
            .map((p) => p.productClass)
            .filter((value): value is ProductClass => value !== undefined),
        ),
      ),
    };

    profile.fdaMaturityScore = calculateFDAMaturityScore(profile);
    return profile;
  }

  /**
   * Calculate time from FDA approval to acquisition date
   */
  calculateTimeToAcquisition(
    approvalDate: string,
    acquisitionDate: string
  ): { days: number; months: number; description: string } {
    const approval = new Date(approvalDate);
    const acquisition = new Date(acquisitionDate);
    const diffMs = acquisition.getTime() - approval.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.round(days / 30);

    let description: string;
    if (days < 0) {
      description = `Acquired ${Math.abs(months)} months BEFORE FDA approval`;
    } else if (months < 6) {
      description = `Acquired within 6 months of FDA approval`;
    } else if (months < 24) {
      description = `Acquired ${months} months post-approval`;
    } else {
      description = `Acquired ${Math.round(months / 12)} years post-approval`;
    }

    return { days, months, description };
  }

  private buildCompanyQuery(companyName: string): string {
    const variants = this.generateNameVariants(companyName);
    return variants.map(v => `applicant:"${v}" OR sponsor_name:"${v}"`).join(' OR ');
  }

  private generateNameVariants(name: string): string[] {
    const variants = new Set([name]);
    variants.add(name.replace(/\s+/g, ''));
    variants.add(name.replace(/\s+/g, '-'));
    variants.add(name.replace(/,\s*(Inc|LLC|Corp|Ltd)\.?/i, ''));
    const firstWord = name.split(/\s+/)[0];
    if (firstWord.length > 3) variants.add(firstWord);
    return Array.from(variants);
  }

  private parseDevices(results: unknown[]): FDAProduct[] {
    return results.map((raw) => {
      const r = this.asRecord(raw);
      const openfda = this.asRecord(r.openfda);
      return {
        productId: this.asString(r.k_number) || this.asString(r.id),
        productName: this.asString(r.device_name) || this.asString(openfda.device_name) || 'Unknown',
        companyName: this.asString(r.applicant) || this.asString(r.sponsor_name),
      type: 'device',
      clearanceType: '510k',
        approvalDate: this.asString(r.date_received) || this.asString(r.decision_date),
        productClass: this.parseDeviceClass(openfda.device_class),
        indications: this.asString(openfda.indications_for_use) ? [this.asString(openfda.indications_for_use)] : [],
        devicePanel: this.asOptionalString(openfda.medical_specialty_description),
        reviewTimeDays:
          this.asString(r.clearance_date) && this.asString(r.date_received)
            ? Math.round(
                (new Date(this.asString(r.clearance_date)).getTime() -
                  new Date(this.asString(r.date_received)).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : undefined,
      };
    });
  }

  private parsePMA(results: unknown[]): FDAProduct[] {
    return results.map((raw) => {
      const r = this.asRecord(raw);
      const openfda = this.asRecord(r.openfda);
      return {
        productId: this.asString(r.pma_number) || this.asString(r.id),
        productName: this.asString(openfda.device_name) || 'Unknown',
        companyName: this.asString(r.applicant),
      type: 'device',
      clearanceType: 'PMA',
        approvalDate: this.asString(r.decision_date),
      productClass: 'CLASS_III',
        indications: this.asArray(r.supplement_reason).map((x) => this.asString(x)).filter(Boolean),
      };
    });
  }

  private parseDeNovo(results: unknown[]): FDAProduct[] {
    return results.map((raw) => {
      const r = this.asRecord(raw);
      const openfda = this.asRecord(r.openfda);
      return {
        productId: this.asString(r.denovo_number) || this.asString(r.id),
        productName: this.asString(r.device_name) || this.asString(openfda.device_name) || 'Unknown',
        companyName: this.asString(r.applicant),
      type: 'device',
      clearanceType: 'DENovo',
        approvalDate: this.asString(r.decision_date) || this.asString(r.date_received),
      productClass: 'CLASS_II',
        indications: this.asString(openfda.indications_for_use) ? [this.asString(openfda.indications_for_use)] : [],
      };
    });
  }

  private parseDrugs(results: unknown[]): FDAProduct[] {
    return results.flatMap((raw) => {
      const r = this.asRecord(raw);
      const submissions = this.asArray(r.submissions).map((s) => this.asRecord(s));
      const firstProduct = this.asRecord(this.asArray(r.products)[0]);
      const firstAi = this.asRecord(this.asArray(firstProduct.active_ingredients)[0]);

      return submissions.map((s) => ({
        productId: this.asString(s.application_number) || this.asString(r.id),
        productName:
          this.asString(firstProduct.brand_name) ||
          this.asString(firstProduct.generic_name) ||
          'Unknown',
        companyName: this.asString(r.sponsor_name),
        type: 'drug',
        clearanceType: this.parseDrugType(s.submission_type ?? s.application_number),
        approvalDate: this.asString(s.submission_status_date) || this.asString(s.submission_class_date),
        drugActiveIngredient: this.asOptionalString(firstAi.name),
        indications: this.asString(firstProduct.indications_and_usage)
          ? [this.asString(firstProduct.indications_and_usage)]
          : [],
      }));
    });
  }

  private parseDeviceClass(deviceClass: unknown): ProductClass {
    const cls = this.asString(deviceClass).toUpperCase();
    if (cls === '1' || cls === 'I') return 'CLASS_I';
    if (cls === '2' || cls === 'II') return 'CLASS_II';
    if (cls === '3' || cls === 'III') return 'CLASS_III';
    return 'UNCLASSIFIED';
  }

  private parseDrugType(appNumber: unknown): DrugApprovalType {
    const s = this.asString(appNumber);
    if (s.startsWith('NDA')) return 'NDA';
    if (s.startsWith('ANDA')) return 'ANDA';
    if (s.startsWith('BLA')) return 'BLA';
    return 'OTC';
  }

  private getEarliestDate(products: FDAProduct[]): string | undefined {
    if (products.length === 0) return undefined;
    const dates = products.map(p => new Date(p.approvalDate)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return undefined;
    return new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
  }

  private getLatestDate(products: FDAProduct[]): string | undefined {
    if (products.length === 0) return undefined;
    const dates = products.map(p => new Date(p.approvalDate)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return undefined;
    return new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    return {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private asOptionalString(value: unknown): string | undefined {
    const s = this.asString(value);
    return s ? s : undefined;
  }
}

export function calculateFDAMaturityScore(profile: CompanyFDAProfile): number {
  if (profile.totalProducts === 0) return 0;

  // Highest clearance type score
  let clearanceScore = 0;
  if (profile.hasPMA || profile.hasNDA) clearanceScore = 100;
  else if (profile.hasDeNovo) clearanceScore = 70;
  else if (profile.has510k) clearanceScore = 50;

  // Product class score (average)
  const classScores = profile.productClasses.map(c => PRODUCT_CLASS_SCORES[c] || 40);
  const avgClassScore = classScores.length > 0 
    ? classScores.reduce((a, b) => a + b, 0) / classScores.length 
    : 0;

  // Portfolio depth score
  const portfolioScore = Math.min(profile.totalProducts * 10, 100);

  // Recency score (more recent = higher, up to 5 years)
  let recencyScore = 0;
  if (profile.latestApprovalDate) {
    const yearsSinceApproval = (Date.now() - new Date(profile.latestApprovalDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
    recencyScore = Math.max(0, 100 - (yearsSinceApproval * 20));
  }

  return Math.round(clearanceScore * 0.4 + avgClassScore * 0.2 + portfolioScore * 0.2 + recencyScore * 0.2);
}

export const openFDAClient = new OpenFDAClient();
