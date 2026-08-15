export type SourceUrlKind = "direct" | "edgar_locator";

const URL_IN_TEXT = /https?:\/\/[^\s)]+/i;
const SEC_PATTERN = /\b(8-k|10-k|10-q|sec edgar|s-4|merger proxy|form 8)\b/i;

/** True when the URL is an EDGAR company browse, not a specific accession. */
export function isEdgarLocatorUrl(url: string): boolean {
  return url.includes("browse-edgar");
}

/**
 * Locator for a citation. Never invents a filing accession — only extracts an
 * embedded URL or points EDGAR browse at the acquirer's ticker when the
 * citation is a regulatory form.
 */
export function inferSourceUrl(
  citation: string,
  acquirerTicker?: string,
): string | undefined {
  const embedded = citation.match(URL_IN_TEXT)?.[0];
  if (embedded) return embedded;
  const ticker = acquirerTicker?.trim();
  if (!ticker || !SEC_PATTERN.test(citation)) return undefined;
  const form = /\b10-k\b/i.test(citation)
    ? "10-K"
    : /\b10-q\b/i.test(citation)
    ? "10-Q"
    : /\bs-4\b/i.test(citation)
    ? "S-4"
    : "8-K";
  const params = new URLSearchParams({
    action: "getcompany",
    CIK: ticker,
    type: form,
    owner: "include",
    count: "10",
  });
  return `https://www.sec.gov/cgi-bin/browse-edgar?${params.toString()}`;
}
