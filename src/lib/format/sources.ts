import type { VerifiedCompany } from '@/data/verifiedData';
import { verifiedCompanies } from '@/data/verifiedData';

/** Compact provenance line for UI footnotes (max items, middle-dot separated). */
export function formatSourceLine(
  sources: readonly string[],
  options?: { max?: number; valuationSource?: string }
): string {
  const max = options?.max ?? 2;
  const parts: string[] = [];
  if (options?.valuationSource) parts.push(options.valuationSource);
  for (const s of sources) {
    if (parts.length >= max) break;
    if (!parts.includes(s)) parts.push(s);
  }
  return parts.slice(0, max).join(' · ');
}

export function getVerifiedCompanyRecord(name: string): VerifiedCompany | undefined {
  return verifiedCompanies.find((c) => c.name === name);
}

export function sourcesForCompany(name: string): {
  sources: string[];
  valuationSource?: string;
} {
  const record = getVerifiedCompanyRecord(name);
  if (!record) return { sources: [] };
  return {
    sources: [...record.sources],
    valuationSource: record.valuationSource,
  };
}
