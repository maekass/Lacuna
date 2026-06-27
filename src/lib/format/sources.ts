import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

/** Compact provenance line for UI footnotes (max items, middle-dot separated). */
export function formatSourceLine(
  sources: readonly string[],
  options?: { max?: number; valuationSource?: string },
): string {
  const max = options?.max ?? 2;
  const parts: string[] = [];
  if (options?.valuationSource) parts.push(options.valuationSource);
  for (const s of sources) {
    if (parts.length >= max) break;
    if (!parts.includes(s)) parts.push(s);
  }
  return parts.slice(0, max).join(" · ");
}

export function getVerifiedCompanyRecord(
  companies: readonly VerifiedCompanyView[],
  name: string,
): VerifiedCompanyView | undefined {
  return companies.find((c) => c.name === name);
}

export function sourcesForCompany(
  companies: readonly VerifiedCompanyView[],
  name: string,
): {
  sources: string[];
  valuationSource?: string;
} {
  const record = getVerifiedCompanyRecord(companies, name);
  if (!record) return { sources: [] };
  return {
    sources: [...record.sources],
    valuationSource: record.valuationSource,
  };
}
