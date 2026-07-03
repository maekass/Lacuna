/** Women's health search terms for public-record full-text queries (SEC EFTS, etc.). */

export const WH_CONDITION_SEARCH_TERMS: readonly string[] = [
  "endometriosis",
  "fertility",
  "gynecolog",
  "menopause",
  "maternal",
  "contraception",
  "obstetric",
  "postpartum",
  "reproductive",
  "pelvic",
  "ovarian",
  "uterine",
  "femtech",
] as const;

/** OR-joined query for SEC EFTS full-text search. */
export function buildWhEftsQuery(extraTerms: string[] = []): string {
  const terms = [...new Set([...WH_CONDITION_SEARCH_TERMS, ...extraTerms])];
  return terms.map((t) => `"${t}"`).join(" OR ");
}

/** Industry-group hints in Form D XML (healthcare / pharma). */
export const FORM_D_HEALTH_INDUSTRY_HINTS: readonly string[] = [
  "Biotechnology",
  "Pharmaceuticals",
  "Health Care",
  "Medical",
  "Other Health Care",
] as const;
