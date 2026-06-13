/** Metadata for a VCF (or gVCF) blob in object storage. */
export interface VariantCallset {
  callsetId: string;
  sampleId: string;
  studyId: string;
  assembly: string;
  objectUri: string;
  bytes: number;
  variantCount: number;
  ingestedAt: string;
  checksum: string;
  notes?: string;
}

/** Queryable variant summary row (not full genotype matrices). */
export interface VariantRecord {
  callsetId: string;
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  qual: number;
  filter: string;
  geneSymbol: string;
  consequence: string;
  alleleFrequency: number;
  isPathogenic: boolean;
}

export interface VariantPageResult {
  variants: VariantRecord[];
  meta: {
    callsetId?: string;
    chrom?: string;
    gene?: string;
    limit: number;
    offset: number;
    total: number;
  };
}

export interface CallsetPageResult {
  callsets: VariantCallset[];
  meta: {
    studyId?: string;
    limit: number;
    offset: number;
    total: number;
  };
}
